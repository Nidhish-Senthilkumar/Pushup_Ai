import numpy as np
import csv
import random
import pandas as pd

# Set random seed for reproducibility
np.random.seed(42)

def generate_pushup_sequence(label, num_frames=150):
    """
    Generate synthetic pushup angle data as a temporal sequence (5 seconds at 30fps)
    Simulates the motion of going down and up during a pushup
    Returns: array of shape (num_frames, 8) - [hip, r_shoulder, l_shoulder, r_elbow, l_elbow, r_knee, l_knee, label]
    """
    data = []
    
    # Create time progression (0 to 1 for the full pushup cycle)
    # Down phase: 0 to 0.4, Bottom hold: 0.4 to 0.6, Up phase: 0.6 to 1.0
    t = np.linspace(0, 1, num_frames)
    
    for frame_idx in range(num_frames):
        time = t[frame_idx]
        
        # Calculate pushup phase (sine wave creates smooth down-up motion)
        # 0 = top position, 1 = bottom position
        pushup_phase = (1 - np.cos(2 * np.pi * time)) / 2  # Smooth 0->1->0 cycle
        
        if label == 0:  # Good Pushup
            # Hip stays straight throughout (160-179°)
            hip_top = np.random.uniform(175, 179)
            hip_bottom = np.random.uniform(170, 175)
            hip = hip_top + (hip_bottom - hip_top) * pushup_phase
            
            # Shoulders flex during descent
            shoulder_top = np.random.uniform(160, 170)
            shoulder_bottom = np.random.uniform(130, 145)
            r_shoulder = shoulder_top + (shoulder_bottom - shoulder_top) * pushup_phase
            l_shoulder = r_shoulder + np.random.uniform(-3, 3)  # Slight asymmetry
            
            # Elbows bend significantly (170° -> 65°)
            elbow_top = np.random.uniform(165, 170)
            elbow_bottom = np.random.uniform(65, 80)
            r_elbow = elbow_top + (elbow_bottom - elbow_top) * pushup_phase
            l_elbow = r_elbow + np.random.uniform(-5, 5)
            
            # Knees stay straight
            r_knee = np.random.uniform(175, 179)
            l_knee = np.random.uniform(175, 179)
        
        elif label == 1:  # Elbows Wide
            hip_top = np.random.uniform(175, 179)
            hip_bottom = np.random.uniform(170, 175)
            hip = hip_top + (hip_bottom - hip_top) * pushup_phase
            
            # Shoulders stay MORE open (wider angle = elbows flaring out)
            shoulder_top = np.random.uniform(150, 160)
            shoulder_bottom = np.random.uniform(110, 130)  # Stays wide at bottom
            r_shoulder = shoulder_top + (shoulder_bottom - shoulder_top) * pushup_phase
            l_shoulder = r_shoulder + np.random.uniform(-3, 3)
            
            # Elbows don't bend as much because they're flared
            elbow_top = np.random.uniform(165, 170)
            elbow_bottom = np.random.uniform(90, 120)
            r_elbow = elbow_top + (elbow_bottom - elbow_top) * pushup_phase
            l_elbow = r_elbow + np.random.uniform(-5, 5)
            
            r_knee = np.random.uniform(175, 179)
            l_knee = np.random.uniform(175, 179)
        
        elif label == 2:  # Hips High (Pike position)
            # Hip stays bent throughout (pike/downward dog position)
            hip_top = np.random.uniform(145, 165)
            hip_bottom = np.random.uniform(130, 150)
            hip = hip_top + (hip_bottom - hip_top) * pushup_phase
            
            # Shoulders at different angle due to pike
            shoulder_top = np.random.uniform(160, 180)
            shoulder_bottom = np.random.uniform(140, 160)
            r_shoulder = shoulder_top + (shoulder_bottom - shoulder_top) * pushup_phase
            l_shoulder = r_shoulder + np.random.uniform(-3, 3)
            
            elbow_top = np.random.uniform(160, 170)
            elbow_bottom = np.random.uniform(80, 110)
            r_elbow = elbow_top + (elbow_bottom - elbow_top) * pushup_phase
            l_elbow = r_elbow + np.random.uniform(-5, 5)
            
            r_knee = np.random.uniform(175, 179)
            l_knee = np.random.uniform(175, 179)
        
        elif label == 3:  # Knees Sagging
            hip_top = np.random.uniform(170, 179)
            hip_bottom = np.random.uniform(160, 170)
            hip = hip_top + (hip_bottom - hip_top) * pushup_phase
            
            shoulder_top = np.random.uniform(155, 170)
            shoulder_bottom = np.random.uniform(125, 145)
            r_shoulder = shoulder_top + (shoulder_bottom - shoulder_top) * pushup_phase
            l_shoulder = r_shoulder + np.random.uniform(-3, 3)
            
            elbow_top = np.random.uniform(165, 170)
            elbow_bottom = np.random.uniform(65, 90)
            r_elbow = elbow_top + (elbow_bottom - elbow_top) * pushup_phase
            l_elbow = r_elbow + np.random.uniform(-5, 5)
            
            # Knees bend throughout (sagging)
            knee_top = np.random.uniform(145, 160)
            knee_bottom = np.random.uniform(120, 140)
            r_knee = knee_top + (knee_bottom - knee_top) * pushup_phase
            l_knee = r_knee + np.random.uniform(-5, 5)
        
        # Add small noise to make it realistic
        noise_scale = 1.5
        hip += np.random.uniform(-noise_scale, noise_scale)
        r_shoulder += np.random.uniform(-noise_scale, noise_scale)
        l_shoulder += np.random.uniform(-noise_scale, noise_scale)
        r_elbow += np.random.uniform(-noise_scale, noise_scale)
        l_elbow += np.random.uniform(-noise_scale, noise_scale)
        r_knee += np.random.uniform(-noise_scale, noise_scale)
        l_knee += np.random.uniform(-noise_scale, noise_scale)
        
        data.append([hip, r_shoulder, l_shoulder, r_elbow, l_elbow, r_knee, l_knee, label])
    
    return data

# Generate data for each class
print("Generating synthetic SEQUENTIAL placeholder data...")
print("=" * 50)

# Training data: multiple sequences per class
num_training_sequences = 50  # 50 sequences per class

for label in range(4):
    label_names = ["good_pushup", "elbows_wide", "hips_high", "knees_sagging"]
    all_sequences = []
    
    for seq_idx in range(num_training_sequences):
        sequence = generate_pushup_sequence(label, num_frames=150)
        all_sequences.extend(sequence)  # Flatten all sequences into one file
    
    df = pd.DataFrame(all_sequences)
    filename = f"./data/fake_training_data/{label_names[label]}_synthetic.csv"
    df.to_csv(filename, index=False, header=False)
    
    print(f"✓ Generated {num_training_sequences} sequences for Label {label}: {label_names[label]}")
    print(f"  Total frames: {len(all_sequences)} (150 frames × {num_training_sequences} sequences)")
    print(f"  Saved to: {filename}")
    print()

# Generate test data: one sequence per file
print("Generating test sequences...")
for i in range(500):
    label = random.randint(0, 3)
    test_sequence = generate_pushup_sequence(label, num_frames=150)
    test_df = pd.DataFrame(test_sequence)
    test_df.to_csv(f"./data/fake_test_data/test_data{i}.csv", index=False, header=False)

print(f"✓ Generated 500 test sequences (150 frames each)")
print()

print("=" * 50)
print("SEQUENTIAL DATA READY!")
print()
print("Data format: Each sequence is 150 frames (5 seconds @ 30fps)")
print("Frame format: [hip, r_shoulder, l_shoulder, r_elbow, l_elbow, r_knee, l_knee, label]")
print()
print("Key changes:")
print("- Angles now change smoothly over time (down -> bottom -> up)")
print("- Each 150-frame sequence represents one complete pushup")
print("- Training files contain multiple sequences concatenated")
print("- Test files contain one sequence each")
print()
print("Next steps:")
print("1. Reshape data into 3D arrays: (num_sequences, 150, 7)")
print("2. Train LSTM on these temporal sequences")
print("3. Model will learn the temporal patterns of good vs bad form")
print()
print("⚠️  REMEMBER: These are placeholder values!")
print("    Real data will have different distributions.")