use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use tokio::sync::Semaphore;
use serde::{Deserialize, Serialize};

// ─── Job ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadJob {
    pub id: String,
    pub url: String,
    pub format_id: String,
    pub output_path: String,
    pub priority: u8,       // 1 = haute, 5 = basse
    pub turbo_mode: bool,
    pub auto_convert_mp4: bool,
    pub extract_audio: bool,
    pub status: JobStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Queued,
    Downloading,
    Converting,
    Done,
    Error(String),
    Cancelled,
}

// ─── DownloadManager ──────────────────────────────────────────────────────────
//
// Architecture :
//   - `semaphore`  : contrôle le nombre de téléchargements simultanés
//   - `jobs`       : liste de tous les jobs (actifs + en attente)
//   - `max_slots`  : nombre de slots (1 = free, N = premium)
//
// Quand start_download est appelé :
//   1. Le job est ajouté à `jobs` avec status Queued
//   2. Un tokio::task est spawné
//   3. Le task acquiert un permit du semaphore (bloque si tous les slots sont pris)
//   4. Une fois le permit acquis, le téléchargement démarre
//   5. Le permit est relâché à la fin (succès ou erreur)

pub struct DownloadManager {
    pub semaphore: Arc<Semaphore>,
    pub jobs: Arc<Mutex<VecDeque<DownloadJob>>>,
    #[allow(dead_code)]
    pub max_slots: usize,
}

impl DownloadManager {
    pub fn new(max_slots: usize) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(max_slots)),
            jobs: Arc::new(Mutex::new(VecDeque::new())),
            max_slots,
        }
    }

    /// Ajoute un job trié par priorité
    pub fn enqueue(&self, mut job: DownloadJob) {
        job.status = JobStatus::Queued;
        let mut jobs = self.jobs.lock().unwrap();
        let pos = jobs.iter().position(|j| j.priority > job.priority).unwrap_or(jobs.len());
        jobs.insert(pos, job);
    }

    /// Met à jour le statut d'un job
    pub fn update_status(&self, id: &str, status: JobStatus) {
        let mut jobs = self.jobs.lock().unwrap();
        if let Some(job) = jobs.iter_mut().find(|j| j.id == id) {
            job.status = status;
        }
    }

    /// Annule un job (s'il est en attente, il ne démarrera pas)
    pub fn cancel(&self, id: &str) {
        self.update_status(id, JobStatus::Cancelled);
    }

    /// Retourne le nombre de slots disponibles
    #[allow(dead_code)]
    pub fn available_slots(&self) -> usize {
        self.semaphore.available_permits()
    }

    /// Retourne le nombre de téléchargements actifs
    #[allow(dead_code)]
    pub fn active_count(&self) -> usize {
        self.max_slots - self.available_slots()
    }

    /// Retourne le nombre de jobs en attente
    #[allow(dead_code)]
    pub fn queued_count(&self) -> usize {
        self.jobs.lock().unwrap()
            .iter()
            .filter(|j| j.status == JobStatus::Queued)
            .count()
    }

    /// Vérifie si un job est annulé (appelé avant de démarrer)
    pub fn is_cancelled(&self, id: &str) -> bool {
        self.jobs.lock().unwrap()
            .iter()
            .find(|j| j.id == id)
            .map(|j| j.status == JobStatus::Cancelled)
            .unwrap_or(false)
    }

    /// Supprime les jobs terminés/annulés de la liste
    pub fn cleanup(&self) {
        let mut jobs = self.jobs.lock().unwrap();
        jobs.retain(|j| !matches!(j.status, JobStatus::Done | JobStatus::Cancelled | JobStatus::Error(_)));
    }
}

pub type SharedManager = Arc<DownloadManager>;

pub fn new_manager(max_slots: usize) -> SharedManager {
    Arc::new(DownloadManager::new(max_slots))
}

// ─── Compatibilité avec l'ancien code ────────────────────────────────────────
// Alias pour ne pas casser les imports existants

pub type SharedQueue = SharedManager;

#[allow(dead_code)]
pub fn new_queue() -> SharedQueue {
    // Par défaut : 1 slot (free). Sera mis à jour après check_premium_status.
    new_manager(1)
}

pub fn enqueue(queue: &SharedQueue, job: DownloadJob) {
    queue.enqueue(job);
}

pub fn cancel_job(queue: &SharedQueue, id: &str) {
    queue.cancel(id);
}
