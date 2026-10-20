#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, io, path::Path};
use tauri::Manager;

/// Depois de uma atualização, o WebView2 pode continuar a servir a interface da
/// versão anterior a partir da cache. No primeiro arranque de cada versão nova,
/// apaga-se essa cache (a mesma solução da Farmácia Pinto e da Flor de Lotus).
#[cfg(target_os = "windows")]
fn limpar_cache_se_mudou_versao(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
  let versao_atual = app.package_info().version.to_string();
  let pasta_dados = app.path().app_local_data_dir()?;
  fs::create_dir_all(&pasta_dados)?;

  let marcador = pasta_dados.join("versao-da-cache-webview.txt");
  let versao_anterior = fs::read_to_string(&marcador).unwrap_or_default();

  if versao_anterior.trim() != versao_atual {
    apagar_pastas_webview(&pasta_dados)?;

    if let Ok(pasta_cache) = app.path().app_cache_dir() {
      apagar_pastas_webview(&pasta_cache)?;
    }

    fs::write(marcador, versao_atual)?;
  }

  Ok(())
}

#[cfg(not(target_os = "windows"))]
fn limpar_cache_se_mudou_versao(_app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
  Ok(())
}

fn apagar_pastas_webview(base: &Path) -> io::Result<()> {
  for nome in ["EBWebView", "WebView2", "webview2"] {
    let pasta = base.join(nome);
    if pasta.exists() {
      fs::remove_dir_all(pasta)?;
    }
  }
  Ok(())
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      if let Err(erro) = limpar_cache_se_mudou_versao(&app.handle().clone()) {
        eprintln!("não foi possível limpar a cache do WebView: {erro}");
      }
      Ok(())
    })
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
