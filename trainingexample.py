import torch
import torch.nn as nn
import torch.optim as optim
import matplotlib.pyplot as plt

# 1. Create fake data (100 points, 2 features)
X = torch.rand(100, 2) * 2 - 1   # random points between -1 and 1
y = (X[:, 0] * X[:, 1] > 0).long()  # label = 1 if x*y > 0 else 0

# 2. Define MLP model
class SimpleMLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(2, 8),   # input=2 features, hidden=8 neurons
            nn.ReLU(), # activation function to make model run faster
            nn.Linear(8, 7)    # output=7 classes
        )
    def forward(self, x):
        return self.layers(x)

model = SimpleMLP()

# 3. Training setup
criterion = nn.CrossEntropyLoss() # Loss function - Cross Entropy Loss
optimizer = optim.Adam(model.parameters(), lr=0.01) # applies weights

# 4. Train the model
for epoch in range(10000):
    optimizer.zero_grad() # forget old gradients 
    outputs = model(X) # run prediction
    loss = criterion(outputs, y) # gets the loss 
    loss.backward() # backpropogation and get new gradients
    optimizer.step() # apply gradients
    if (epoch+1) % 20 == 0:
        print(f"Epoch {epoch+1}, Loss: {loss.item():.4f}")

# 5. Test on one sample
with torch.no_grad():
    sample = torch.tensor([[0, 0.5]])  # input point
    pred = model(sample)
    print("Prediction:", torch.argmax(pred).item())
    sample2 = torch.tensor([[0.1,0.5]])
    pred2 = model(sample)
    print("Pred2: ", torch.argmax(pred2).item())
