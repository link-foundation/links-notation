use links_notation::{format_links, parse_lino_to_links, StreamParser};
use std::sync::{Arc, Mutex};

const DOCUMENT: &str = "first loves data\n\
profile:\n\
  name Ada\n\
  note \"line one\nline two\"\n\
(nested:\n  child value)\n\
last sees first";

#[test]
fn matches_the_canonical_parser_one_character_at_a_time() {
    let mut stream = StreamParser::new();
    for character in DOCUMENT.chars() {
        stream.write(&character.to_string()).unwrap();
    }

    assert_eq!(
        format_links(&stream.finish().unwrap()),
        format_links(&parse_lino_to_links(DOCUMENT).unwrap())
    );
}

#[test]
fn emits_only_complete_records_to_the_callback() {
    let seen = Arc::new(Mutex::new(Vec::new()));
    let callback_seen = Arc::clone(&seen);
    let mut stream = StreamParser::new();
    stream.on_link(move |link| callback_seen.lock().unwrap().push(link.to_string()));

    assert!(stream
        .write("profile:\n  name Ada\n  note \"first\nsecond\"\n")
        .unwrap()
        .is_empty());
    let emitted = stream.write("n").unwrap();

    assert_eq!(emitted.len(), 1);
    assert_eq!(*seen.lock().unwrap(), vec![emitted[0].to_string()]);
}

#[test]
fn supports_line_chunks_final_record_and_position() {
    let mut stream = StreamParser::new();
    for line in DOCUMENT.split_inclusive('\n') {
        stream.write(line).unwrap();
    }

    assert_eq!(
        format_links(&stream.finish().unwrap()),
        format_links(&parse_lino_to_links(DOCUMENT).unwrap())
    );
    assert_eq!(stream.position().offset, DOCUMENT.len());
    assert_eq!(stream.position().buffered, 0);
}

#[test]
fn supports_drain_reset_and_bounded_memory() {
    let seen = Arc::new(Mutex::new(0));
    let callback_seen = Arc::clone(&seen);
    let mut stream = StreamParser::new();
    stream.set_collect(false);
    stream.set_max_buffer_size(8).unwrap();
    stream.on_link(move |_| *callback_seen.lock().unwrap() += 1);
    for _ in 0..100 {
        stream.write("a\n").unwrap();
    }

    assert!(stream.drain().is_empty());
    assert_eq!(stream.finish().unwrap().len(), 1);
    assert_eq!(*seen.lock().unwrap(), 100);

    stream.reset();
    assert!(stream.write("123456789").is_err());
}

#[test]
fn provides_an_iterator_adapter() {
    let actual = StreamParser::parse_chunks(["one link\n", "two link"])
        .map(|link| link.unwrap().to_string())
        .collect::<Vec<_>>();

    assert_eq!(actual, vec!["(one link)", "(two link)"]);
}
