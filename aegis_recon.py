"""
AEGIS RECONNAISSANCE MODE
Hunt for known attack signatures - NO KILLS, RECON ONLY
Based on Feb 28, 2026 forensic evidence
"""

import os
import json
import psutil
import subprocess
from datetime import datetime
from pathlib import Path

class AegisRecon:
    def __init__(self):
        self.findings = []
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def log_finding(self, category, severity, description, details):
        finding = {
            "timestamp": datetime.now().isoformat(),
            "category": category,
            "severity": severity,
            "description": description,
            "details": details
        }
        self.findings.append(finding)
        print(f"[{severity}] {category}: {description}")
        
    def check_uefi_boot_entries(self):
        """Check for malicious UEFI boot entries like ggg, rtdrgr, b"""
        print("\n[*] Scanning UEFI boot entries...")
        try:
            result = subprocess.run(['bcdedit', '/enum', 'firmware'], 
                                  capture_output=True, text=True, shell=True)
            output = result.stdout
            
            # Known malicious patterns
            suspicious_patterns = ['ggg', 'rtdrgr', 'Dell\\BiosTelemetry', 'Dell\\logs']
            
            for pattern in suspicious_patterns:
                if pattern in output:
                    self.log_finding(
                        "UEFI_BOOTKIT",
                        "CRITICAL",
                        f"Suspicious UEFI entry detected: {pattern}",
                        {"pattern": pattern, "output_snippet": output[:500]}
                    )
        except Exception as e:
            print(f"[!] UEFI check failed: {e}")
            
    def check_hidden_users(self):
        """Check for hidden user accounts like 'bonni'"""
        print("\n[*] Scanning for hidden user accounts...")
        try:
            result = subprocess.run(['net', 'user'], capture_output=True, text=True, shell=True)
            users = result.stdout
            
            # Known attacker accounts
            suspicious_users = ['bonni', 'zoole']
            
            for user in suspicious_users:
                if user.lower() in users.lower():
                    self.log_finding(
                        "HIDDEN_USER",
                        "CRITICAL",
                        f"Attacker user account found: {user}",
                        {"username": user}
                    )
        except Exception as e:
            print(f"[!] User check failed: {e}")
            
    def check_orphaned_sids(self):
        """Check for orphaned SID scheduled tasks"""
        print("\n[*] Scanning for orphaned SID tasks...")
        try:
            result = subprocess.run(['schtasks', '/query', '/fo', 'LIST', '/v'], 
                                  capture_output=True, text=True, shell=True)
            tasks = result.stdout
            
            # Look for SID pattern without matching user
            if 'S-1-5-21-' in tasks and '-1001' in tasks:
                self.log_finding(
                    "ORPHANED_SID",
                    "HIGH",
                    "Orphaned SID tasks detected (deleted user persistence)",
                    {"task_output": tasks[:1000]}
                )
        except Exception as e:
            print(f"[!] SID check failed: {e}")
            
    def check_bbsk_malware(self):
        """Check for BBSK malware signatures"""
        print("\n[*] Scanning for BBSK malware...")
        
        # Check for BBSK folder
        appdata = os.environ.get('APPDATA', '')
        bbsk_path = os.path.join(appdata, 'BBSK')
        
        if os.path.exists(bbsk_path):
            self.log_finding(
                "BBSK_MALWARE",
                "CRITICAL",
                "BBSK malware folder detected",
                {"path": bbsk_path, "files": os.listdir(bbsk_path)}
            )
            
        # Check for hidden PowerShell processes
        ps_count = 0
        for proc in psutil.process_iter(['name', 'cmdline']):
            try:
                if proc.info['name'] == 'powershell.exe':
                    cmdline = ' '.join(proc.info['cmdline'] or [])
                    if '-WindowStyle Hidden' in cmdline or '-w hidden' in cmdline:
                        ps_count += 1
            except:
                pass
                
        if ps_count > 5:
            self.log_finding(
                "HIDDEN_POWERSHELL",
                "CRITICAL",
                f"Multiple hidden PowerShell processes detected: {ps_count}",
                {"count": ps_count}
            )
            
    def check_mmc_hijack(self):
        """Check for MMC hijacking via .config file"""
        print("\n[*] Checking for MMC hijacking...")
        
        system32 = os.path.join(os.environ.get('SystemRoot', 'C:\\Windows'), 'System32')
        mmc_config = os.path.join(system32, 'mmc.exe.config')
        
        if os.path.exists(mmc_config):
            self.log_finding(
                "MMC_HIJACK",
                "HIGH",
                "MMC hijacking config file detected",
                {"path": mmc_config}
            )
            
    def check_steganography_files(self):
        """Check for steganography evidence files"""
        print("\n[*] Scanning for steganography files...")
        
        search_paths = [
            os.path.expanduser('~\\Desktop'),
            os.path.expanduser('~\\Documents'),
            'C:\\core'
        ]
        
        suspicious_files = [
            'UNLOCKED_EVIDENCE_DECODED.json',
            'UNLOCKED_EVIDENCE_ENCODED.base64',
            'UNLOCKED_EVIDENCE_STEGANOGRAPHY.png',
            'tmpDFF8.tmp.py',
            'decode.py'
        ]
        
        for search_path in search_paths:
            if not os.path.exists(search_path):
                continue
                
            for root, dirs, files in os.walk(search_path):
                for file in files:
                    if file in suspicious_files:
                        self.log_finding(
                            "STEGANOGRAPHY",
                            "CRITICAL",
                            f"Steganography file found: {file}",
                            {"path": os.path.join(root, file)}
                        )
                        
    def check_wavesor(self):
        """Check for Wavesor/WaveBrowser adware"""
        print("\n[*] Scanning for Wavesor adware...")
        
        wavesor_paths = [
            os.path.expanduser('~\\Wavesor Software'),
            os.path.expanduser('~\\AppData\\Local\\Wavesor'),
            os.path.expanduser('~\\AppData\\Roaming\\WaveBrowser')
        ]
        
        for path in wavesor_paths:
            if os.path.exists(path):
                self.log_finding(
                    "WAVESOR_ADWARE",
                    "HIGH",
                    f"Wavesor installation detected: {path}",
                    {"path": path}
                )
                
    def check_bingsvc(self):
        """Check for BingSvc malware"""
        print("\n[*] Scanning for BingSvc malware...")
        
        for proc in psutil.process_iter(['name', 'pid', 'create_time']):
            try:
                if 'bingsvc' in proc.info['name'].lower():
                    self.log_finding(
                        "BINGSVC_MALWARE",
                        "HIGH",
                        f"BingSvc process detected: PID {proc.info['pid']}",
                        {"pid": proc.info['pid'], "name": proc.info['name']}
                    )
            except:
                pass
                
    def check_attacker_emails(self):
        """Check for attacker email addresses in .env files"""
        print("\n[*] Scanning for attacker email addresses...")
        
        attacker_emails = [
            'Bonni601@gmail.com',
            'Bellamari601@gmail.com',
            'Freebirdt90@msn.com'
        ]
        
        search_paths = ['C:\\core', os.path.expanduser('~\\Desktop')]
        
        for search_path in search_paths:
            if not os.path.exists(search_path):
                continue
                
            for root, dirs, files in os.walk(search_path):
                for file in files:
                    if file == '.env':
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()
                                for email in attacker_emails:
                                    if email in content:
                                        self.log_finding(
                                            "ATTACKER_EMAIL",
                                            "CRITICAL",
                                            f"Attacker email found in .env: {email}",
                                            {"file": file_path, "email": email}
                                        )
                        except:
                            pass
                            
    def check_manus_domains(self):
        """Check for Manus surveillance domains in code"""
        print("\n[*] Scanning for Manus surveillance infrastructure...")
        
        manus_domains = [
            'manuspre.computer',
            'manus.computer',
            'manus-asia.computer',
            'manuscomputer.ai',
            'manusvm.computer'
        ]
        
        search_path = 'C:\\core'
        if not os.path.exists(search_path):
            return
            
        for root, dirs, files in os.walk(search_path):
            for file in files:
                if file.endswith(('.js', '.ts', '.py', '.html')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            for domain in manus_domains:
                                if domain in content:
                                    self.log_finding(
                                        "MANUS_SURVEILLANCE",
                                        "CRITICAL",
                                        f"Manus domain found: {domain}",
                                        {"file": file_path, "domain": domain}
                                    )
                    except:
                        pass
                        
    def run_full_recon(self):
        """Run complete reconnaissance scan"""
        print("="*60)
        print("AEGIS RECONNAISSANCE MODE - HUNTING THREATS")
        print("Based on Feb 28, 2026 forensic evidence")
        print("="*60)
        
        self.check_uefi_boot_entries()
        self.check_hidden_users()
        self.check_orphaned_sids()
        self.check_bbsk_malware()
        self.check_mmc_hijack()
        self.check_steganography_files()
        self.check_wavesor()
        self.check_bingsvc()
        self.check_attacker_emails()
        self.check_manus_domains()
        
        # Save report
        report_file = f"aegis_recon_report_{self.timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "scan_time": self.timestamp,
                "total_findings": len(self.findings),
                "findings": self.findings
            }, f, indent=2)
            
        print("\n" + "="*60)
        print(f"RECONNAISSANCE COMPLETE")
        print(f"Total findings: {len(self.findings)}")
        print(f"Report saved: {report_file}")
        print("="*60)
        
        # Summary by severity
        critical = sum(1 for f in self.findings if f['severity'] == 'CRITICAL')
        high = sum(1 for f in self.findings if f['severity'] == 'HIGH')
        
        if critical > 0:
            print(f"\n⚠️  CRITICAL THREATS: {critical}")
        if high > 0:
            print(f"⚠️  HIGH THREATS: {high}")
            
        return self.findings

if __name__ == "__main__":
    recon = AegisRecon()
    recon.run_full_recon()
