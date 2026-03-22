#!/usr/bin/env python3
"""
4D TEXT ENCODER/DECODER
Visual Semantic Compression System
Converts normal text to 4D visual markup
"""

import re
import json
from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum

class EmotionColor(Enum):
    RED = "🔴"      # Critical/Alert
    ORANGE = "🟠"   # Warning
    YELLOW = "🟡"   # Insight
    GREEN = "🟢"    # Success
    BLUE = "🔵"     # Info/Logic
    PURPLE = "🟣"   # Special/Meta
    BLACK = "⚫"    # Standard
    WHITE = "⚪"    # Pure/Truth

class Intensity(Enum):
    NORMAL = 0
    ITALIC = 1      # *text*
    BOLD = 2        # **text**
    CRITICAL = 3    # ***text***
    STRIKE = 4      # ~~text~~

@dataclass
class SemanticToken:
    text: str
    color: EmotionColor = EmotionColor.BLACK
    intensity: Intensity = Intensity.NORMAL
    is_key_concept: bool = False  # \word/
    is_container: bool = False    # /phrase\\
    temporal: str = None          # [NOW], [WAS], etc
    agent: str = None             # @USER, @AI, etc

class FourDEncoder:
    """Converts plain text to 4D visual semantic format"""
    
    # Emotion detection patterns
    EMOTION_PATTERNS = {
        EmotionColor.RED: [r'\b(critical|alert|danger|attack|enemy|threat|emergency)\b', r'🚨|🔥|💀|⚠️'],
        EmotionColor.ORANGE: [r'\b(warning|caution|attention|careful|beware)\b', r'⚠️|🔶'],
        EmotionColor.YELLOW: [r'\b(insight|idea|note|important|remember|key)\b', r'💡|⭐|📌'],
        EmotionColor.GREEN: [r'\b(success|complete|done|working|good|yes|fixed)\b', r'✅|✓|🎉|💚'],
        EmotionColor.BLUE: [r'\b(info|data|logic|think|analyze|process)\b', r'ℹ️|🧠|📊'],
        EmotionColor.PURPLE: [r'\b(system|meta|special|unique|magic)\b', r'🔮|✨|🎯'],
    }
    
    # Key concept patterns (what gets \wrapped/)
    KEY_PATTERNS = [
        r'\b(surveillance|encryption|malware|backdoor|rootkit|steganography)\b',
        r'\b(AEGIS|Manus|Unity|Kiro|Grok|Gemini)\b',
        r'\b(bootkit|UEFI|WMI|persistence|exfiltration)\b',
        r'\b(compromised|breached|intrusion|payload)\b',
    ]
    
    # Agent detection
    AGENT_PATTERNS = {
        "@USER": [r'\b(I|me|my|we|our|Charles)\b'],
        "@AI": [r'\b(AI|assistant|copilot|orchestrator|system)\b'],
        "@ENEMY": [r'\b(attacker|threat actor|adversary|intruder|Manus)\b'],
        "@SYS": [r'\b(Windows|system|kernel|firmware)\b'],
    }
    
    def __init__(self):
        self.tokens = []
    
    def detect_emotion(self, text: str) -> EmotionColor:
        """Detect emotional color from text patterns"""
        text_lower = text.lower()
        for color, patterns in self.EMOTION_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    return color
        return EmotionColor.BLACK
    
    def detect_intensity(self, text: str) -> Intensity:
        """Detect importance/intensity"""
        # Critical indicators
        if re.search(r'\b(critical|urgent|emergency|immediately|now|must)\b', text, re.IGNORECASE):
            return Intensity.CRITICAL
        # Bold indicators
        elif re.search(r'\b(important|key|main|primary|essential)\b', text, re.IGNORECASE):
            return Intensity.BOLD
        # Italic indicators (context/secondary)
        elif re.search(r'\b(additionally|furthermore|meanwhile|however|note that)\b', text, re.IGNORECASE):
            return Intensity.ITALIC
        return Intensity.NORMAL
    
    def wrap_key_concepts(self, text: str) -> str:
        """Wrap important concepts with \\ markers"""
        for pattern in self.KEY_PATTERNS:
            def replacer(match):
                return f"\\{match.group()}/"
            text = re.sub(pattern, replacer, text, flags=re.IGNORECASE)
        return text
    
    def add_agents(self, text: str) -> str:
        """Add agent markers where appropriate"""
        for agent, patterns in self.AGENT_PATTERNS.items():
            for pattern in patterns:
                text = re.sub(pattern, agent + r" \g<0>", text, flags=re.IGNORECASE, count=1)
        return text
    
    def encode_sentence(self, sentence: str) -> str:
        """Encode a single sentence to 4D format"""
        emotion = self.detect_emotion(sentence)
        intensity = self.detect_intensity(sentence)
        
        # Wrap key concepts
        encoded = self.wrap_key_concepts(sentence)
        
        # Add agents
        encoded = self.add_agents(encoded)
        
        # Apply intensity markers
        if intensity == Intensity.CRITICAL:
            encoded = f"***{encoded}***"
        elif intensity == Intensity.BOLD:
            encoded = f"**{encoded}**"
        elif intensity == Intensity.ITALIC:
            encoded = f"*{encoded}*"
        
        # Apply color
        encoded = f"{emotion.value}{encoded}"
        
        return encoded
    
    def encode(self, text: str) -> str:
        """Main encode function"""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        encoded_sentences = [self.encode_sentence(s.strip()) for s in sentences if s.strip()]
        return " ".join(encoded_sentences)
    
    def compress_stats(self, original: str, encoded: str) -> Dict:
        """Calculate compression statistics"""
        orig_len = len(original)
        enc_len = len(encoded)
        reduction = ((orig_len - enc_len) / orig_len) * 100
        
        return {
            "original_chars": orig_len,
            "encoded_chars": enc_len,
            "reduction_percent": round(reduction, 1),
            "compression_ratio": f"{orig_len}:{enc_len}",
            "bytes_saved": orig_len - enc_len
        }

class FourDDecoder:
    """Decodes 4D format back to readable text"""
    
    COLOR_MEANINGS = {
        "🔴": "[CRITICAL] ",
        "🟠": "[WARNING] ",
        "🟡": "[INSIGHT] ",
        "🟢": "[SUCCESS] ",
        "🔵": "[INFO] ",
        "🟣": "[SPECIAL] ",
        "⚫": "",
        "⚪": "[PURE] ",
    }
    
    def decode(self, encoded_text: str) -> str:
        """Decode 4D text to expanded form"""
        decoded = encoded_text
        
        # Replace color markers with meaning
        for color, meaning in self.COLOR_MEANINGS.items():
            decoded = decoded.replace(color, meaning)
        
        # Remove markup but preserve meaning
        decoded = re.sub(r'\\(\w+)/', r'[KEY:\1]', decoded)
        decoded = re.sub(r'/(\w+)\\', r'[CONTAINER:\1]', decoded)
        decoded = re.sub(r'\*\*\*(.+?)\*\*\*', r'[CRITICAL:\1]', decoded)
        decoded = re.sub(r'\*\*(.+?)\*\*', r'[IMPORTANT:\1]', decoded)
        decoded = re.sub(r'\*(.+?)\*', r'[CONTEXT:\1]', decoded)
        decoded = re.sub(r'~~(.+?)~~', r'[DEPRECATED:\1]', decoded)
        
        return decoded

def demo():
    """Demonstrate 4D text compression"""
    
    test_sentences = [
        "The enemy has deployed a surveillance system that monitors camera access continuously.",
        "Critical alert: AEGIS defense system detected unauthorized UEFI bootkit installation.",
        "Success! The malware has been neutralized and all persistence vectors eliminated.",
        "Important note: User credentials were compromised in the October identity theft incident.",
        "The AI orchestrator is working properly and encoding context with 90% compression."
    ]
    
    encoder = FourDEncoder()
    decoder = FourDDecoder()
    
    print("=" * 70)
    print("4D TEXT VISUAL SEMANTIC COMPRESSION DEMO")
    print("=" * 70)
    
    total_orig = 0
    total_enc = 0
    
    for sentence in test_sentences:
        encoded = encoder.encode(sentence)
        decoded = decoder.decode(encoded)
        stats = encoder.compress_stats(sentence, encoded)
        
        print(f"\n🔹 ORIGINAL ({stats['original_chars']} chars):")
        print(f"   {sentence}")
        print(f"\n🔸 4D ENCODED ({stats['encoded_chars']} chars):")
        print(f"   {encoded}")
        print(f"\n📊 COMPRESSION: {stats['reduction_percent']}% reduction")
        
        total_orig += stats['original_chars']
        total_enc += stats['encoded_chars']
    
    total_reduction = ((total_orig - total_enc) / total_orig) * 100
    print(f"\n" + "=" * 70)
    print(f"TOTAL COMPRESSION: {total_reduction:.1f}%")
    print(f"Original: {total_orig} chars → Encoded: {total_enc} chars")
    print("=" * 70)

if __name__ == "__main__":
    demo()
