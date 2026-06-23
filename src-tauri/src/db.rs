use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use once_cell::sync::Lazy;

pub static DB: Lazy<Mutex<Connection>> = Lazy::new(|| {
    let conn = Connection::open(get_db_path()).expect("Failed to open SQLite DB");
    init_db(&conn).expect("Failed to init DB");
    Mutex::new(conn)
});

fn get_db_path() -> std::path::PathBuf {
    let mut path = dirs_next::data_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    path.push("telvid-vizane");
    std::fs::create_dir_all(&path).ok();
    path.push("library.db");
    path
}

fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS library (
            id              TEXT PRIMARY KEY,
            title           TEXT NOT NULL,
            uploader        TEXT DEFAULT '',
            thumbnail_path  TEXT DEFAULT '',
            file_path       TEXT NOT NULL,
            duration_seconds INTEGER DEFAULT 0,
            file_size_mb    REAL DEFAULT 0,
            downloaded_at   TEXT NOT NULL,
            platform        TEXT DEFAULT '',
            format          TEXT DEFAULT 'mp4',
            quality         TEXT DEFAULT '',
            source_url      TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );",
    )?;

    let migrations = [
        "ALTER TABLE library ADD COLUMN uploader TEXT DEFAULT ''",
        "ALTER TABLE library ADD COLUMN quality TEXT DEFAULT ''",
        "ALTER TABLE library ADD COLUMN source_url TEXT DEFAULT ''",
    ];
    for sql in &migrations {
        let _ = conn.execute(sql, []);
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadedVideo {
    pub id: String,
    pub title: String,
    pub uploader: String,
    pub thumbnail_path: String,
    pub file_path: String,
    pub duration_seconds: u64,
    pub file_size_mb: f32,
    pub downloaded_at: String,
    pub platform: String,
    pub format: String,
    pub quality: String,
    pub source_url: String,
}

pub fn insert_video(video: &DownloadedVideo) -> Result<()> {
    let conn = DB.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO library
         (id, title, uploader, thumbnail_path, file_path, duration_seconds,
          file_size_mb, downloaded_at, platform, format, quality, source_url)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        params![
            video.id, video.title, video.uploader, video.thumbnail_path,
            video.file_path, video.duration_seconds, video.file_size_mb,
            video.downloaded_at, video.platform, video.format, video.quality,
            video.source_url
        ],
    )?;
    Ok(())
}

pub fn get_all_videos() -> Result<Vec<DownloadedVideo>> {
    let conn = DB.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, title, uploader, thumbnail_path, file_path,
                duration_seconds, file_size_mb, downloaded_at, platform, format, quality,
                COALESCE(source_url, '') as source_url
         FROM library ORDER BY downloaded_at DESC"
    )?;
    let videos = stmt.query_map([], |row| {
        Ok(DownloadedVideo {
            id:               row.get(0)?,
            title:            row.get(1)?,
            uploader:         row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            thumbnail_path:   row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            file_path:        row.get(4)?,
            duration_seconds: row.get::<_, i64>(5)? as u64,
            file_size_mb:     row.get(6)?,
            downloaded_at:    row.get(7)?,
            platform:         row.get::<_, Option<String>>(8)?.unwrap_or_default(),
            format:           row.get::<_, Option<String>>(9)?.unwrap_or_default(),
            quality:          row.get::<_, Option<String>>(10)?.unwrap_or_default(),
            source_url:       row.get::<_, Option<String>>(11)?.unwrap_or_default(),
        })
    })?
    .filter_map(|r| r.ok())
    .collect();
    Ok(videos)
}

pub fn delete_video_by_id(id: &str) -> Result<String> {
    let file_path: String = {
        let conn = DB.lock().unwrap();
        conn.query_row(
            "SELECT file_path FROM library WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).unwrap_or_default()
    };
    let conn = DB.lock().unwrap();
    conn.execute("DELETE FROM library WHERE id = ?1", params![id])?;
    Ok(file_path)
}

pub fn update_video_metadata(
    id: &str,
    title: &str,
    uploader: &str,
    thumbnail_path: &str,
    duration_seconds: u64,
    platform: &str,
    file_size_mb: f32,
) -> Result<()> {
    let conn = DB.lock().unwrap();
    conn.execute(
        "UPDATE library SET
            title = ?1,
            uploader = ?2,
            thumbnail_path = ?3,
            duration_seconds = ?4,
            platform = ?5,
            file_size_mb = ?6
         WHERE id = ?7",
        params![title, uploader, thumbnail_path, duration_seconds, platform, file_size_mb, id],
    )?;
    Ok(())
}

/// Retourne les entrées dont la miniature est vide OU le titre est une URL
pub fn get_incomplete_videos() -> Result<Vec<(String, String, String, String)>> {
    // Retourne (id, title, file_path, source_url)
    let conn = DB.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, title, file_path, COALESCE(source_url,'') FROM library
         WHERE title LIKE 'http%'
            OR thumbnail_path = ''
            OR thumbnail_path IS NULL"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
        ))
    })?
    .filter_map(|r| r.ok())
    .collect();
    Ok(rows)
}

pub fn update_source_url(id: &str, source_url: &str) -> Result<()> {
    let conn = DB.lock().unwrap();
    conn.execute(
        "UPDATE library SET source_url = ?1 WHERE id = ?2",
        params![source_url, id],
    )?;
    Ok(())
}

pub fn get_setting(key: &str) -> Option<String> {
    let conn = DB.lock().unwrap();
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    ).ok()
}

pub fn set_setting(key: &str, value: &str) -> Result<()> {
    let conn = DB.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}
