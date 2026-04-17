//! Viral / trending charts service.
//!
//! Fetches chart data from free, no-auth-required sources:
//! - Apple Music RSS Charts (genre charts per country)
//! - Deezer Chart API (top tracks per country)
//!
//! All HTTP requests are made on a blocking thread via the Tauri command
//! handler so the UI stays responsive.

pub mod sources;
pub mod commands;
