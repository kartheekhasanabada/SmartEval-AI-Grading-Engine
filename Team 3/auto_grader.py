import time
import os
import shutil
import subprocess
import sys
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# The folders Team 1 and Team 2 will use
INCOMING_FOLDER = os.path.join(BASE_DIR, "scanned_jsons")
COMPLETED_FOLDER = os.path.join(BASE_DIR, "completed_jsons")
EVALUATOR_SCRIPT = os.path.join(BASE_DIR, "evaluator.py")

# Automatically create the folders if they don't exist yet
os.makedirs(INCOMING_FOLDER, exist_ok=True)
os.makedirs(COMPLETED_FOLDER, exist_ok=True)

class JsonHandler(FileSystemEventHandler):
    def on_created(self, event):
        # Ignore folders, only look at .json files
        if event.is_directory or not event.src_path.endswith('.json'):
            return
            
        file_name = os.path.basename(event.src_path)
        print(f"\n[ALERT] 🚨 Team 1 dropped a new answer sheet: {file_name}")
        
        # Wait 1 second to make sure Team 1's scanner completely finished writing the file
        time.sleep(1) 
        
        try:
            # 1. Run the AI Evaluator on this specific file
            print(f"⚙️ Waking up AI engine to grade {file_name}...")
            subprocess.run([sys.executable, EVALUATOR_SCRIPT, event.src_path], check=True)
            
            # 2. Move the JSON to the completed folder so we don't grade it twice!
            dest_path = os.path.join(COMPLETED_FOLDER, file_name)
            if os.path.exists(dest_path):
                os.remove(dest_path) # Overwrite if it already exists
            shutil.move(event.src_path, dest_path)
            
            print(f"✅ Moved {file_name} to completed folder. Standing by for next file...\n")
            print("-" * 50)
            
        except Exception as e:
            print(f"❌ Error processing {file_name}: {e}")

if __name__ == "__main__":
    event_handler = JsonHandler()
    observer = Observer()
    observer.schedule(event_handler, path=INCOMING_FOLDER, recursive=False)
    observer.start()
    
    print("=" * 50)
    print(f"👀 Auto-Grader is ONLINE and watching the '{INCOMING_FOLDER}' folder.")
    print("Drop a JSON file in there to test it! (Press Ctrl+C in terminal to shut down)")
    print("=" * 50)
    
    try:
        while True:
            time.sleep(1) # Keep the script running forever
    except KeyboardInterrupt:
        observer.stop()
        print("\nAuto-Grader shutting down. Goodbye!")
        
    observer.join()