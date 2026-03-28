use std::fs;

#[tauri::command]
pub fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}
