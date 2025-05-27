from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import RobertaTokenizer, RobertaForSequenceClassification
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn.functional as F

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

tokenizer = RobertaTokenizer.from_pretrained("model")
model = RobertaForSequenceClassification.from_pretrained("model")

blocklist = set()

class Message(BaseModel):
    text: str

class EmailBlock(BaseModel):
    email: str

@app.post("/classify/")
def classify(msg: Message):
    inputs = tokenizer(msg.text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=1)
        label = torch.argmax(probs).item()
        score = probs[0][label].item()
    explanation = "Potential scam." if label else "Message looks safe."
    return {"label": f"LABEL_{label}", "score": score, "explanation": explanation}

@app.get("/blocklist/")
def get_blocklist():
    return list(blocklist)

@app.post("/blocklist/add")
def add_block(email: EmailBlock):
    blocklist.add(email.email.lower())
    return {"status": "added"}

@app.post("/blocklist/remove")
def remove_block(email: EmailBlock):
    blocklist.discard(email.email.lower())
    return {"status": "removed"}