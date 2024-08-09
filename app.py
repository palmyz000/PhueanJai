from flask import Flask, request, jsonify
from transformers import XLMRobertaTokenizer, XLMRobertaForSequenceClassification
import torch
from safetensors.torch import load_file as safetensors_load

app = Flask(__name__)

# Load the tokenizer
tokenizer = XLMRobertaTokenizer.from_pretrained('xlm-roberta-finetuned')

# Load the model using safetensors
state_dict = safetensors_load("xlm-roberta-finetuned/model.safetensors")
model = XLMRobertaForSequenceClassification.from_pretrained('xlm-roberta-base', state_dict=state_dict, num_labels=4)
device = torch.device('cuda') if torch.cuda.is_available() else torch.device('cpu')
model.to(device)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    text = data['text']
    inputs = tokenizer(text, return_tensors='pt', truncation=True, padding=True, max_length=256).to(device)
    outputs = model(**inputs)
    predictions = torch.argmax(outputs.logits, dim=1).cpu().numpy()
    return jsonify({'prediction': int(predictions[0])})

if __name__ == '__main__':
    app.run(port=5001, host='0.0.0.0')
