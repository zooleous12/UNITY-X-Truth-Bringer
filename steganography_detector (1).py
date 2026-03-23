#!/usr/bin/env python3
"""
Advanced Steganography Detection Tool
Identifies various steganographic techniques in image files
"""

import os
import sys
import json
import hashlib
import numpy as np
from PIL import Image
from PIL.ExifTags import TAGS
import argparse

class SteganographyDetector:
    def __init__(self):
        self.suspicious_indicators = []
        self.analysis_results = {}
    
    def analyze_file_size_anomaly(self, image_path):
        """Detect file size anomalies that indicate hidden data"""
        try:
            img = Image.open(image_path)
            width, height = img.size
            channels = len(img.getbands())
            
            # Calculate expected file size
            pixel_count = width * height
            expected_min_size = pixel_count * channels + 100  # Base PNG overhead
            expected_max_size = pixel_count * channels * 2 + 500  # With compression
            
            actual_size = os.path.getsize(image_path)
            
            # Calculate size ratio
            if pixel_count > 0:
                size_ratio = actual_size / (pixel_count * channels)
            else:
                size_ratio = float('inf')
            
            analysis = {
                'actual_size': actual_size,
                'expected_range': [expected_min_size, expected_max_size],
                'pixel_count': pixel_count,
                'size_ratio': size_ratio,
                'suspicious': False,
                'reason': None
            }
            
            # Detect anomalies
            if actual_size > expected_max_size * 2:
                analysis['suspicious'] = True
                analysis['reason'] = f"File {actual_size/expected_max_size:.1f}x larger than expected"
                self.suspicious_indicators.append("Excessive file size for image dimensions")
            
            # Special case: tiny images with large files
            if pixel_count <= 100 and actual_size > 500:
                analysis['suspicious'] = True
                analysis['reason'] = f"Tiny image ({width}x{height}) with large file size ({actual_size} bytes)"
                self.suspicious_indicators.append("Tiny carrier image with disproportionate file size")
            
            return analysis
            
        except Exception as e:
            return {'error': str(e)}
    
    def analyze_metadata(self, image_path):
        """Analyze image metadata for hidden data"""
        try:
            img = Image.open(image_path)
            metadata_analysis = {
                'format': img.format,
                'mode': img.mode,
                'size': img.size,
                'suspicious_fields': [],
                'large_metadata': [],
                'total_metadata_size': 0
            }
            
            # Analyze PNG info
            if hasattr(img, 'info') and img.info:
                for key, value in img.info.items():
                    value_str = str(value)
                    value_size = len(value_str)
                    metadata_analysis['total_metadata_size'] += value_size
                    
                    # Check for suspiciously large metadata fields
                    if value_size > 100:
                        metadata_analysis['large_metadata'].append({
                            'field': key,
                            'size': value_size,
                            'preview': value_str[:100] + '...' if value_size > 100 else value_str
                        })
                        self.suspicious_indicators.append(f"Large metadata field: {key} ({value_size} bytes)")
                    
                    # Check for suspicious field names
                    suspicious_names = ['context', 'data', 'hidden', 'secret', 'payload', 'evidence']
                    if any(name in key.lower() for name in suspicious_names):
                        metadata_analysis['suspicious_fields'].append(key)
                        self.suspicious_indicators.append(f"Suspicious metadata field name: {key}")
                    
                    # Check for JSON-like content
                    if value_str.strip().startswith(('{', '[')):
                        try:
                            json.loads(value_str)
                            metadata_analysis['suspicious_fields'].append(f"{key} (JSON data)")
                            self.suspicious_indicators.append(f"JSON data in metadata field: {key}")
                        except:
                            pass
            
            # Analyze EXIF data
            if hasattr(img, '_getexif') and img._getexif():
                exif_data = img._getexif()
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    value_str = str(value)
                    if len(value_str) > 100:
                        metadata_analysis['large_metadata'].append({
                            'field': f"EXIF_{tag}",
                            'size': len(value_str),
                            'preview': value_str[:100] + '...'
                        })
            
            return metadata_analysis
            
        except Exception as e:
            return {'error': str(e)}
    
    def analyze_lsb_entropy(self, image_path):
        """Analyze LSB entropy to detect LSB steganography"""
        try:
            img = Image.open(image_path)
            img_array = np.array(img)
            
            if len(img_array.shape) < 2:
                return {'error': 'Invalid image format for LSB analysis'}
            
            entropy_analysis = {
                'channels': [],
                'suspicious_channels': [],
                'overall_suspicious': False
            }
            
            if len(img_array.shape) == 3:  # Color image
                for channel in range(img_array.shape[2]):
                    channel_data = img_array[:, :, channel]
                    lsb_data = channel_data & 1  # Extract LSBs
                    
                    # Calculate entropy
                    unique, counts = np.unique(lsb_data, return_counts=True)
                    if len(unique) > 1:
                        probabilities = counts / counts.sum()
                        entropy = -np.sum(probabilities * np.log2(probabilities))
                    else:
                        entropy = 0.0
                    
                    channel_info = {
                        'channel': channel,
                        'entropy': entropy,
                        'suspicious': entropy > 0.7  # High entropy suggests hidden data
                    }
                    
                    entropy_analysis['channels'].append(channel_info)
                    
                    if entropy > 0.7:
                        entropy_analysis['suspicious_channels'].append(channel)
                        self.suspicious_indicators.append(f"High LSB entropy in channel {channel}: {entropy:.3f}")
            
            else:  # Grayscale
                lsb_data = img_array & 1
                unique, counts = np.unique(lsb_data, return_counts=True)
                if len(unique) > 1:
                    probabilities = counts / counts.sum()
                    entropy = -np.sum(probabilities * np.log2(probabilities))
                else:
                    entropy = 0.0
                
                entropy_analysis['channels'].append({
                    'channel': 'grayscale',
                    'entropy': entropy,
                    'suspicious': entropy > 0.7
                })
            
            entropy_analysis['overall_suspicious'] = len(entropy_analysis['suspicious_channels']) > 0
            
            return entropy_analysis
            
        except Exception as e:
            return {'error': str(e)}
    
    def analyze_pixel_patterns(self, image_path):
        """Analyze pixel patterns for steganographic indicators"""
        try:
            img = Image.open(image_path)
            img_array = np.array(img)
            
            pattern_analysis = {
                'uniformity_check': {},
                'noise_analysis': {},
                'suspicious_patterns': []
            }
            
            # Check for unusual uniformity (like 1x1 images)
            if img_array.size <= 10:  # Very small images
                pattern_analysis['uniformity_check'] = {
                    'type': 'minimal_carrier',
                    'pixel_count': img_array.size,
                    'suspicious': True,
                    'reason': 'Extremely small carrier image'
                }
                self.suspicious_indicators.append("Minimal carrier image detected")
            
            # Analyze noise patterns in larger images
            elif img_array.size > 100:
                if len(img_array.shape) == 3:
                    for channel in range(img_array.shape[2]):
                        channel_data = img_array[:, :, channel]
                        
                        # Calculate standard deviation (noise indicator)
                        std_dev = np.std(channel_data)
                        
                        # Check for unusual noise patterns
                        if std_dev < 1.0:  # Very low noise
                            pattern_analysis['suspicious_patterns'].append(
                                f"Channel {channel}: Unusually low noise (std: {std_dev:.3f})"
                            )
            
            return pattern_analysis
            
        except Exception as e:
            return {'error': str(e)}
    
    def generate_detection_report(self, image_path):
        """Generate comprehensive steganography detection report"""
        print("=" * 80)
        print("ADVANCED STEGANOGRAPHY DETECTION REPORT")
        print("=" * 80)
        print(f"File: {image_path}")
        print(f"File size: {os.path.getsize(image_path)} bytes")
        print()
        
        # File size analysis
        print("1. FILE SIZE ANOMALY ANALYSIS:")
        print("-" * 40)
        size_analysis = self.analyze_file_size_anomaly(image_path)
        if 'error' not in size_analysis:
            print(f"Actual size: {size_analysis['actual_size']} bytes")
            print(f"Expected range: {size_analysis['expected_range'][0]}-{size_analysis['expected_range'][1]} bytes")
            print(f"Size ratio: {size_analysis['size_ratio']:.2f} bytes/pixel")
            if size_analysis['suspicious']:
                print(f"⚠️  SUSPICIOUS: {size_analysis['reason']}")
        else:
            print(f"Error: {size_analysis['error']}")
        print()
        
        # Metadata analysis
        print("2. METADATA ANALYSIS:")
        print("-" * 40)
        metadata_analysis = self.analyze_metadata(image_path)
        if 'error' not in metadata_analysis:
            print(f"Format: {metadata_analysis['format']}")
            print(f"Mode: {metadata_analysis['mode']}")
            print(f"Dimensions: {metadata_analysis['size']}")
            print(f"Total metadata size: {metadata_analysis['total_metadata_size']} bytes")
            
            if metadata_analysis['large_metadata']:
                print("\n⚠️  LARGE METADATA FIELDS DETECTED:")
                for field in metadata_analysis['large_metadata']:
                    print(f"  - {field['field']}: {field['size']} bytes")
                    print(f"    Preview: {field['preview']}")
            
            if metadata_analysis['suspicious_fields']:
                print(f"\n⚠️  SUSPICIOUS FIELD NAMES: {metadata_analysis['suspicious_fields']}")
        else:
            print(f"Error: {metadata_analysis['error']}")
        print()
        
        # LSB entropy analysis
        print("3. LSB ENTROPY ANALYSIS:")
        print("-" * 40)
        lsb_analysis = self.analyze_lsb_entropy(image_path)
        if 'error' not in lsb_analysis:
            for channel_info in lsb_analysis['channels']:
                status = "SUSPICIOUS" if channel_info['suspicious'] else "Normal"
                print(f"Channel {channel_info['channel']}: Entropy = {channel_info['entropy']:.3f} ({status})")
            
            if lsb_analysis['overall_suspicious']:
                print(f"\n⚠️  LSB STEGANOGRAPHY DETECTED in channels: {lsb_analysis['suspicious_channels']}")
        else:
            print(f"Error: {lsb_analysis['error']}")
        print()
        
        # Pattern analysis
        print("4. PIXEL PATTERN ANALYSIS:")
        print("-" * 40)
        pattern_analysis = self.analyze_pixel_patterns(image_path)
        if 'error' not in pattern_analysis:
            if pattern_analysis['uniformity_check']:
                uc = pattern_analysis['uniformity_check']
                if uc.get('suspicious'):
                    print(f"⚠️  {uc['type'].upper()}: {uc['reason']}")
            
            for pattern in pattern_analysis['suspicious_patterns']:
                print(f"⚠️  {pattern}")
        else:
            print(f"Error: {pattern_analysis['error']}")
        print()
        
        # Summary
        print("5. DETECTION SUMMARY:")
        print("-" * 40)
        if self.suspicious_indicators:
            print("⚠️  STEGANOGRAPHY INDICATORS DETECTED:")
            for i, indicator in enumerate(self.suspicious_indicators, 1):
                print(f"  {i}. {indicator}")
            print(f"\nRISK LEVEL: {'HIGH' if len(self.suspicious_indicators) >= 3 else 'MEDIUM' if len(self.suspicious_indicators) >= 1 else 'LOW'}")
        else:
            print("✅ No obvious steganographic indicators detected")
        
        print("\n" + "=" * 80)

def main():
    parser = argparse.ArgumentParser(description='Advanced Steganography Detection Tool')
    parser.add_argument('image_path', help='Path to image file to analyze')
    args = parser.parse_args()
    
    if not os.path.exists(args.image_path):
        print(f"Error: File not found: {args.image_path}")
        sys.exit(1)
    
    detector = SteganographyDetector()
    detector.generate_detection_report(args.image_path)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        main()
    else:
        # Default analysis of the evidence file
        detector = SteganographyDetector()
        detector.generate_detection_report("uploaded_files/UNLOCKED_EVIDENCE_STEGANOGRAPHY.png")