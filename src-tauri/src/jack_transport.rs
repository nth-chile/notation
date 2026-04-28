use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct JackQuery {
    pub state: String,
    pub frame: u32,
    pub sample_rate: u32,
}

#[cfg(target_os = "linux")]
mod imp {
    use super::JackQuery;
    use jack::{AsyncClient, Client, ClientOptions, Control, ProcessHandler, ProcessScope};
    use std::sync::Mutex;

    struct Empty;
    impl jack::NotificationHandler for Empty {}
    impl ProcessHandler for Empty {
        fn process(&mut self, _: &Client, _: &ProcessScope) -> Control {
            Control::Continue
        }
    }

    struct State {
        client: AsyncClient<Empty, Empty>,
        sample_rate: u32,
    }

    static STATE: Mutex<Option<State>> = Mutex::new(None);

    pub fn connect() -> Result<u32, String> {
        let mut guard = STATE.lock().map_err(|e| e.to_string())?;
        if guard.is_some() {
            return Err("JACK client already connected".into());
        }
        let (client, _status) = Client::new("nubium", ClientOptions::NO_START_SERVER)
            .map_err(|e| format!("JACK connect failed: {}", e))?;
        let sample_rate = client.sample_rate() as u32;
        let active = client
            .activate_async(Empty, Empty)
            .map_err(|e| format!("JACK activate failed: {}", e))?;
        *guard = Some(State { client: active, sample_rate });
        Ok(sample_rate)
    }

    pub fn disconnect() -> Result<(), String> {
        let mut guard = STATE.lock().map_err(|e| e.to_string())?;
        if let Some(state) = guard.take() {
            state.client.deactivate().map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn transport_start() -> Result<(), String> {
        let guard = STATE.lock().map_err(|e| e.to_string())?;
        let state = guard.as_ref().ok_or("JACK not connected")?;
        state
            .client
            .as_client()
            .transport()
            .start()
            .map_err(|e| format!("JACK start failed: {}", e))
    }

    pub fn transport_stop() -> Result<(), String> {
        let guard = STATE.lock().map_err(|e| e.to_string())?;
        let state = guard.as_ref().ok_or("JACK not connected")?;
        state
            .client
            .as_client()
            .transport()
            .stop()
            .map_err(|e| format!("JACK stop failed: {}", e))
    }

    pub fn transport_locate(frame: u32) -> Result<(), String> {
        let guard = STATE.lock().map_err(|e| e.to_string())?;
        let state = guard.as_ref().ok_or("JACK not connected")?;
        state
            .client
            .as_client()
            .transport()
            .locate(frame)
            .map_err(|e| format!("JACK locate failed: {}", e))
    }

    pub fn transport_query() -> Result<JackQuery, String> {
        let guard = STATE.lock().map_err(|e| e.to_string())?;
        let state = guard.as_ref().ok_or("JACK not connected")?;
        let q = state
            .client
            .as_client()
            .transport()
            .query()
            .map_err(|e| format!("JACK query failed: {}", e))?;
        Ok(JackQuery {
            state: format!("{:?}", q.state).to_lowercase(),
            frame: q.pos.frame(),
            sample_rate: state.sample_rate,
        })
    }
}

#[cfg(not(target_os = "linux"))]
mod imp {
    use super::JackQuery;
    fn unsupported<T>() -> Result<T, String> {
        Err("JACK transport is not supported on this platform".into())
    }
    pub fn connect() -> Result<u32, String> { unsupported() }
    pub fn disconnect() -> Result<(), String> { unsupported() }
    pub fn transport_start() -> Result<(), String> { unsupported() }
    pub fn transport_stop() -> Result<(), String> { unsupported() }
    pub fn transport_locate(_frame: u32) -> Result<(), String> { unsupported() }
    pub fn transport_query() -> Result<JackQuery, String> { unsupported() }
}

#[tauri::command]
pub fn jack_connect() -> Result<u32, String> { imp::connect() }

#[tauri::command]
pub fn jack_disconnect() -> Result<(), String> { imp::disconnect() }

#[tauri::command]
pub fn jack_transport_start() -> Result<(), String> { imp::transport_start() }

#[tauri::command]
pub fn jack_transport_stop() -> Result<(), String> { imp::transport_stop() }

#[tauri::command]
pub fn jack_transport_locate(frame: u32) -> Result<(), String> { imp::transport_locate(frame) }

#[tauri::command]
pub fn jack_transport_query() -> Result<JackQuery, String> { imp::transport_query() }
