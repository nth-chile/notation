use jack::{Client, ClientOptions};
use std::thread::sleep;
use std::time::Duration;

#[cfg(target_os = "macos")]
fn preload_libjack() {
    let extra = "/opt/homebrew/lib:/usr/local/lib";
    let combined = match std::env::var("DYLD_FALLBACK_LIBRARY_PATH") {
        Ok(v) if !v.is_empty() => format!("{}:{}", v, extra),
        _ => extra.to_string(),
    };
    std::env::set_var("DYLD_FALLBACK_LIBRARY_PATH", combined);
}
#[cfg(not(target_os = "macos"))]
fn preload_libjack() {}

struct Empty;
impl jack::NotificationHandler for Empty {}
impl jack::ProcessHandler for Empty {
    fn process(&mut self, _: &Client, _: &jack::ProcessScope) -> jack::Control {
        jack::Control::Continue
    }
}

fn main() {
    preload_libjack();
    println!("connecting to JACK...");
    let (client, status) = Client::new("nubium-smoke", ClientOptions::NO_START_SERVER)
        .expect("connect failed");
    println!("connected. status={:?} sample_rate={}", status, client.sample_rate());

    let active = client.activate_async(Empty, Empty).expect("activate failed");
    println!("client activated");

    sleep(Duration::from_millis(500));

    println!("locate(48000)...");
    active.as_client().transport().locate(48000).expect("locate");

    sleep(Duration::from_millis(500));
    println!("transport.start()...");
    active.as_client().transport().start().expect("start");

    for _ in 0..5 {
        sleep(Duration::from_millis(400));
        let q = active.as_client().transport().query().expect("query");
        println!("  state={:?} frame={}", q.state, q.pos.frame());
    }

    println!("transport.stop()...");
    active.as_client().transport().stop().expect("stop");

    sleep(Duration::from_millis(500));
    let q = active.as_client().transport().query().expect("query");
    println!("after stop: state={:?} frame={}", q.state, q.pos.frame());

    active.deactivate().expect("deactivate");
    println!("done.");
}
