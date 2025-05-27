import pandas as pd
from sklearn.model_selection import train_test_split
from transformers import RobertaTokenizer, RobertaForSequenceClassification, Trainer, TrainingArguments
from transformers import DataCollatorWithPadding
from datasets import Dataset

# Load and prepare data
df = pd.read_csv("dataset.csv")
df = df.dropna()
df["label"] = df["label"].astype(int)

train_texts, val_texts, train_labels, val_labels = train_test_split(df["text"], df["label"], test_size=0.2)

tokenizer = RobertaTokenizer.from_pretrained("roberta-base")

def tokenize(batch):
    return tokenizer(batch["text"], truncation=True)

train_dataset = Dataset.from_dict({"text": train_texts.tolist(), "label": train_labels.tolist()})
val_dataset = Dataset.from_dict({"text": val_texts.tolist(), "label": val_labels.tolist()})

train_dataset = train_dataset.map(tokenize, batched=True)
val_dataset = val_dataset.map(tokenize, batched=True)

model = RobertaForSequenceClassification.from_pretrained("roberta-base", num_labels=2)

args = TrainingArguments(
    output_dir="./model",
    evaluation_strategy="epoch",
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=3,
    save_steps=500,
    save_total_limit=2,
    logging_dir="./logs",
    logging_steps=100,
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    tokenizer=tokenizer,
    data_collator=DataCollatorWithPadding(tokenizer),
)

trainer.train()
trainer.save_model("./model")
tokenizer.save_pretrained("./model")
