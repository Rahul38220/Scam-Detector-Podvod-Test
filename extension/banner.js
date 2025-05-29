// util.js and storage.js will likely be needed for helper functions and managing data
// Ensure these are correctly referenced in manifest.json content_scripts and popup.js

const BACKEND_URL = "http://localhost:8000"; // Or your Railway URL

// Function to send message to backend and get classification
async function classifyEmailContent(emailText) {
    try {
        const response = await fetch(`${BACKEND_URL}/classify/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: emailText }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error classifying email:", error);
        return null; // Handle error gracefully
    }
}

// Function to extract email content (This will be the trickiest part due to Gmail's ever-changing DOM)
function extractEmailDetails(emailElement) {
    // This is highly dependent on Gmail's current DOM structure.
    // You'll need to inspect Gmail using Developer Tools (F12) to find the correct selectors.
    // Example selectors (these are LIKELY to change as Gmail updates):
    const senderElement = emailElement.querySelector('span.go'); // A common span for sender name
    const subjectElement = emailElement.querySelector('h2.hP'); // Common for subject in detailed view
    const bodyElement = emailElement.querySelector('div.msg > div.a3s'); // Common for email body
    const senderEmailElement = emailElement.querySelector('span.gD'); // Sender email address

    const sender = senderElement ? senderElement.innerText : 'Unknown Sender';
    const senderEmail = senderEmailElement ? senderEmailElement.getAttribute('email') || senderEmailElement.innerText : 'unknown@example.com';
    const subject = subjectElement ? subjectElement.innerText : 'No Subject';
    const body = bodyElement ? bodyElement.innerText : 'No Body';

    // Combine for analysis. You might want to send sender and subject separately for more nuanced detection.
    const fullText = `Sender: ${sender} (${senderEmail})\nSubject: ${subject}\nBody: ${body}`;
    return { fullText, senderEmail, subject };
}

// Function to add a warning banner to the email element
function addWarningBanner(emailElement, classification) {
    let banner = emailElement.querySelector('.phish-detect-banner');
    if (banner) {
        // Update existing banner if needed
        banner.innerText = `PhishDetect: ${classification.explanation} (Score: ${classification.score.toFixed(2)})`;
        banner.style.backgroundColor = classification.label === 'LABEL_1' ? '#ffcccc' : '#ccffcc'; // Red for suspicious, green for safe
        banner.style.color = classification.label === 'LABEL_1' ? '#cc0000' : '#006600';
    } else {
        banner = document.createElement('div');
        banner.className = 'phish-detect-banner';
        banner.style.cssText = `
            padding: 5px 10px;
            margin: 5px 0;
            font-weight: bold;
            border-radius: 4px;
            text-align: center;
        `;
        banner.innerText = `PhishDetect: ${classification.explanation} (Score: ${classification.score.toFixed(2)})`;
        banner.style.backgroundColor = classification.label === 'LABEL_1' ? '#ffcccc' : '#ccffcc';
        banner.style.color = classification.label === 'LABEL_1' ? '#cc0000' : '#006600';

        // Find a good place to insert the banner.
        // This is highly dependent on Gmail's DOM. You might insert it near the subject line or at the top of the email body.
        const headerContainer = emailElement.querySelector('div.nH.hx'); // Example: part of the email header
        if (headerContainer) {
            headerContainer.prepend(banner); // Prepend to add it at the top of the header area
        } else {
            // Fallback: append to the emailElement itself (might not look as good)
            emailElement.prepend(banner);
        }
    }
}

// Function to handle a newly detected email view
async function processEmail(emailElement) {
    // Check if we've already processed this email to avoid re-processing on minor DOM changes
    if (emailElement.dataset.phishDetectProcessed) {
        return;
    }
    emailElement.dataset.phishDetectProcessed = 'true'; // Mark as processed

    const { fullText, senderEmail, subject } = extractEmailDetails(emailElement);

    if (fullText) {
        console.log("Analyzing email:", { senderEmail, subject });
        const classification = await classifyEmailContent(fullText);

        if (classification) {
            console.log("Classification result:", classification);
            addWarningBanner(emailElement, classification);

            // Integrate with blocklist functionality
            // This part assumes your storage.js manages the blocklist
            const blockedEmails = await new Promise(resolve => {
                chrome.storage.local.get(['blockedEmails'], (result) => {
                    resolve(result.blockedEmails || []);
                });
            });

            if (blockedEmails.includes(senderEmail.toLowerCase())) {
                 console.warn(`Email from ${senderEmail} is on the blocklist!`);
                 // Add an additional visual cue for blocklisted emails
                 const blocklistBanner = document.createElement('div');
                 blocklistBanner.innerText = `⚠️ Sender is on your blocklist!`;
                 blocklistBanner.style.cssText = `
                    background-color: #ffcc00;
                    color: #993d00;
                    padding: 5px 10px;
                    margin-top: 5px;
                    font-weight: bold;
                    border-radius: 4px;
                    text-align: center;
                 `;
                 const existingBanner = emailElement.querySelector('.phish-detect-banner');
                 if (existingBanner) {
                     existingBanner.after(blocklistBanner); // Insert after the classification banner
                 } else {
                     emailElement.prepend(blocklistBanner); // Or prepend if no classification banner yet
                 }
            }

            // You could also add to history here if you want in-page history
            // But popup.js is likely handling the main history.
        }
    }
}

// Use MutationObserver to detect new emails loaded into the view
const observer = new MutationObserver((mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
                // Look for elements that represent an individual email in the view
                // This selector is CRITICAL and will require trial and error in Gmail's DOM
                // Examples: A div with role="main" or a specific class for an email body
                // For a detailed email view:
                if (node.nodeType === 1 && node.matches && node.matches('div[role="main"] .nH.nn')) { // A common class for the main email content area
                    processEmail(node);
                }
                // For list view (previews):
                if (node.nodeType === 1 && node.matches && node.matches('.AO .zA')) { // A common class for an email row in the list view
                    // You might choose to analyze only when the email is opened, not just in the list.
                    // Or, you could analyze the subject/sender from the list view and flag rows.
                    // For now, let's focus on the detailed view.
                }
            });
        }
    }
});

// Start observing the main content area of Gmail
// You'll need to find the most stable parent element to observe.
// Often, it's a div that contains the entire email list/view.
// Inspect Gmail's DOM carefully (e.g., div.nH.oy8Mbf, or the main div with role="main")
const gmailAppContainer = document.querySelector('.nH.oy8Mbf, .pY'); // Common Gmail app container classes
if (gmailAppContainer) {
    observer.observe(gmailAppContainer, { childList: true, subtree: true });
    console.log("PhishDetect AI: Observing Gmail DOM for new emails.");

    // Also, process any emails already present when the script loads
    // (e.g., if you open Gmail and an email is already displayed)
    const existingEmails = gmailAppContainer.querySelectorAll('div[role="main"] .nH.nn');
    existingEmails.forEach(emailElement => processEmail(emailElement));

} else {
    console.warn("PhishDetect AI: Could not find Gmail app container to observe.");
}

// You might also want to send messages from content script to popup.js for history/blocklist updates
// Example:
// chrome.runtime.sendMessage({ type: "EMAIL_SCANNED", details: { sender, subject, label, score } });
