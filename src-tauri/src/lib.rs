mod commands;
mod db;
mod queue;

use queue::new_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = &*db::DB;

    // Vérifie le plan premium pour déterminer les slots de concurrence
    let premium = commands::premium::check_premium_status();
    let max_slots = premium.concurrent_downloads as usize;
    let manager = new_manager(max_slots.max(1));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(manager)
        .invoke_handler(tauri::generate_handler![
            commands::downloader::get_video_info,
            commands::downloader::start_download,
            commands::downloader::cancel_download,
            commands::converter::convert_to_mp4,
            commands::converter::extract_audio,
            commands::library::get_library,
            commands::library::delete_video,
            commands::library::open_file,
            commands::library::open_folder,
            commands::library::refresh_library_metadata,
            commands::premium::check_premium_status,
            commands::premium::activate_license,
            commands::premium::deactivate_license,
            commands::premium::generate_demo_license,
            commands::premium::get_license_info,
            commands::settings::get_download_dir,
            commands::settings::set_download_dir,
            commands::settings::open_download_dir,
            commands::settings::get_settings,
            commands::settings::save_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
