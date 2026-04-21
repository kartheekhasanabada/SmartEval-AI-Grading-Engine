from sentence_transformers import SentenceTransformer, losses
from sentence_transformers.training_args import SentenceTransformerTrainingArguments
from sentence_transformers.trainer import SentenceTransformerTrainer
from datasets import load_dataset

def main():
    print("🧠 Loading base model for training...")
    # 1. Load the base model we want to improve
    model = SentenceTransformer('all-MiniLM-L6-v2')

    print("☁️ Downloading STS Benchmark Dataset from the Cloud...")
    # 2. Download the famous GLUE STSb dataset automatically via API
    dataset = load_dataset("glue", "stsb")
    
    # We will use the 'train' split which has 5,749 examples
    train_dataset = dataset['train']

    # 3. Normalize the Grades!
    def normalize_score(example):
        # Convert to float and divide by 5.0 to get 0.0 - 1.0 range
        example['score'] = float(example['label']) / 5.0
        return example
        
    print("🧹 Cleaning and normalizing the data...")
    train_dataset = train_dataset.map(normalize_score)

    # --- THE FIX IS HERE ---
    # Throw away the integer 'idx' and old 'label' columns so the AI doesn't choke on them!
    train_dataset = train_dataset.select_columns(['sentence1', 'sentence2', 'score'])

    # 4. Create the Loss Function
    train_loss = losses.CosineSimilarityLoss(model)

    # 5. Set up Training Arguments
    args = SentenceTransformerTrainingArguments(
        output_dir="./smart_eval_custom_model",
        num_train_epochs=3,       
        per_device_train_batch_size=8,
        warmup_steps=100,
        save_strategy="no",       
        logging_steps=50
    )

    # 6. Initialize the Trainer
    trainer = SentenceTransformerTrainer(
        model=model,
        args=args,
        train_dataset=train_dataset, 
        loss=train_loss   
    )

    # 7. Train the Model!
    print(f"🚀 Training on {len(train_dataset)} real-world examples! (Grab a coffee, this will take 5-10 mins)")
    trainer.train()

    # 8. Save your Enterprise-Grade Custom Model
    custom_model_path = './smart_eval_custom_model'
    model.save_pretrained(custom_model_path)

    print(f"\n🎉 Enterprise Training Complete! Your highly advanced AI is saved in: {custom_model_path}")

if __name__ == "__main__":
    main()