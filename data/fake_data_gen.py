import numpy as np
import csv
import random
import pandas as pd

# Set random seed for reproducibility
np.random.seed(42)

def generate_pushup_data(label, num_samples=150):
    """
    Generate synthetic pushup angle data
    Returns: list of [hip_angle, r_shoulder, l_shoulder, r_elbow, l_elbow, label]
    """
    data = []
    
    if label == 0:  # Good Pushup
        for _ in range(num_samples):
            phase = np.random.uniform(0, 1)
            
            if phase < 0.7:  # Bottom position
                hip = np.random.uniform(160, 179)  # Straight plank
                r_shoulder = np.random.uniform(130, 160)  # Moderate angles
                l_shoulder = np.random.uniform(130, 160)
                r_elbow = np.random.uniform(65, 120)  # Good bend
                l_elbow = np.random.uniform(65, 120)
            else:  # Mid to top range
                hip = np.random.uniform(165, 179)
                r_shoulder = np.random.uniform(150, 179)
                l_shoulder = np.random.uniform(150, 179)
                r_elbow = np.random.uniform(120, 170)
                l_elbow = np.random.uniform(120, 170)
            
            data.append([hip, r_shoulder, l_shoulder, r_elbow, l_elbow, label])
    
    elif label == 1:  # Elbows Wide
        for _ in range(num_samples):
            # Simulate a pushup cycle focusing on bent elbow positions
            phase = np.random.uniform(0, 1)
            
            if phase < 0.7:  # Bottom position (where "wide" is visible)
                hip = np.random.uniform(160, 175)
                r_shoulder = np.random.uniform(110, 140)  # Wider shoulder angles
                l_shoulder = np.random.uniform(110, 140)
                r_elbow = np.random.uniform(70, 130)
                l_elbow = np.random.uniform(70, 130)
            else:  # Mid-range positions
                hip = np.random.uniform(165, 179)
                r_shoulder = np.random.uniform(130, 160)
                l_shoulder = np.random.uniform(130, 160)
                r_elbow = np.random.uniform(100, 140)
                l_elbow = np.random.uniform(100, 140)
            
            data.append([hip, r_shoulder, l_shoulder, r_elbow, l_elbow, label])
    
    elif label == 2:  # Hips High
        for _ in range(num_samples):
            phase = np.random.uniform(0, 1)
            
            if phase < 0.7:  # Bottom position
                hip = np.random.uniform(130, 155)  # Much more bent (pike position)
                r_shoulder = np.random.uniform(140, 170)  # Less shoulder load
                l_shoulder = np.random.uniform(140, 170)
                r_elbow = np.random.uniform(80, 130)
                l_elbow = np.random.uniform(80, 130)
            else:  # Mid-range
                hip = np.random.uniform(140, 165)
                r_shoulder = np.random.uniform(150, 180)
                l_shoulder = np.random.uniform(150, 180)
                r_elbow = np.random.uniform(110, 140)
                l_elbow = np.random.uniform(110, 140)
            
            data.append([hip, r_shoulder, l_shoulder, r_elbow, l_elbow, label])
    
    elif label == 3:  # Sagging
        for _ in range(num_samples):
            phase = np.random.uniform(0, 1)
            
            if phase < 0.7:  # Bottom position
                hip = np.random.uniform(145, 170)  # Sags but not as extreme as hips high
                r_shoulder = np.random.uniform(120, 160)  # Compensating
                l_shoulder = np.random.uniform(120, 160)
                r_elbow = np.random.uniform(70, 125)
                l_elbow = np.random.uniform(70, 125)
            else:  # Mid-range
                hip = np.random.uniform(135, 150)
                r_shoulder = np.random.uniform(150, 175)
                l_shoulder = np.random.uniform(135, 170)
                r_elbow = np.random.uniform(90, 140)
                l_elbow = np.random.uniform(100, 135)
            
            data.append([hip, r_shoulder, l_shoulder, r_elbow, l_elbow, label])
    
    return data

# Generate data for each class
print("Generating synthetic placeholder data...")
print("=" * 50)

good_pushup_data = generate_pushup_data(0, 150)
elbows_wide_data = generate_pushup_data(1, 150)
hips_high_data = generate_pushup_data(2, 150)
sagging_data = generate_pushup_data(3, 150)

for i in range(500):
    label = random.randint(0,3)
    test_data = generate_pushup_data(label, 150)
    test_data = pd.DataFrame(test_data)
    test_data.to_csv(f"./data/fake_test_data/test_data{i}.csv", index=False, header=False)

# Save each to separate files
datasets = [
    (good_pushup_data, "./data/fake_training_data/good_pushup_synthetic.csv", "Label 0: Good Pushup"),
    (elbows_wide_data, "./data/fake_training_data/elbows_wide_synthetic.csv", "Label 1: Elbows Wide"),
    (hips_high_data, "./data/fake_training_data/hips_high_synthetic.csv", "Label 2: Hips High"),
    (sagging_data, "./data/fake_training_data/sagging_synthetic.csv", "Label 3: Sagging")
]

for data, filename, label_name in datasets:
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(data)
    print(f"✓ Generated {len(data)} samples for {label_name}")
    print(f"  Saved to: {filename}")
    
    # Show sample statistics
    data_array = np.array(data)
    print(f"  Hip angle range: {data_array[:, 0].min():.1f}° - {data_array[:, 0].max():.1f}°")
    print(f"  R Shoulder range: {data_array[:, 1].min():.1f}° - {data_array[:, 1].max():.1f}°")
    print(f"  R Elbow range: {data_array[:, 3].min():.1f}° - {data_array[:, 3].max():.1f}°")
    print()

print("=" * 50)
print("ALL 4 CLASSES OF PLACEHOLDER DATA READY!")
print()
print("Next steps:")
print("1. Use these 4 synthetic CSV files to build your pipeline")
print("2. Train and test your softmax regression model")
print("3. Debug any code issues")
print("4. When real data arrives, replace ALL 4 files and retrain")
print()
print("⚠️  REMEMBER: These are placeholder values!")
print("    Real data will have different distributions.")