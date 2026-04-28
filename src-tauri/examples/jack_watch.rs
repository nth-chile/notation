use jack::{Client, ClientOptions};
use std::thread::sleep;
use std::time::Duration;

struct Empty;
impl jack::NotificationHandler for Empty {}
impl jack::ProcessHandler for Empty {
    fn process(&mut self, _: &Client, _: &jack::ProcessScope) -> jack::Control {
        jack::Control::Continue
    }
}

fn main() {
    let (client, _) = Client::new("nubium-watch", ClientOptions::NO_START_SERVER)
        .expect("connect failed (is jackd running? is libjack on dyld path?)");
    println!(
        "watching JACK transport. sample_rate={} (press Ctrl+C to quit)",
        client.sample_rate()
    );
    let active = client.activate_async(Empty, Empty).expect("activate failed");
    let mut last_state = String::new();
    loop {
        let q = active.as_client().transport().query().expect("query");
        let state = format!("{:?}", q.state);
        let frame = q.pos.frame();
        if state != last_state {
            println!("STATE => {} (frame={})", state, frame);
            last_state = state;
        } else if format!("{:?}", q.state) == "Rolling" {
            println!("  frame={}", frame);
        }
        sleep(Duration::from_millis(250));
    }
}
