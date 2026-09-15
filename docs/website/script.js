"use strict";

// The playground runs this repository's parser. It used to run a
// three-hundred-line hand-rolled imitation that lived only in this file, so
// the site could disagree with the library it documents - and did: it still
// reported version 0.6.0 and knew nothing about the nested contexts that
// parentheses opened in 0.16.
import { Parser, formatLinks } from "links-notation";
import { decode, encode } from "lino-objects-codec";

const parser = new Parser();

/** Turn a parsed Link into plain data, so JSON.stringify shows the shape. */
function toPlain(link) {
    const plain = {};
    if (link.id !== null && link.id !== undefined) {
        plain.id = link.id;
    }
    if (link.values && link.values.length > 0) {
        plain.values = link.values.map(toPlain);
    }
    return plain;
}

/**
 * Not every document is an object graph: `papa (lovesMama: loves mama)` is a
 * link, not a record. Asking the codec anyway can produce something that looks
 * like an answer but is not one, so the result is only shown when re-encoding
 * it reproduces the document. Anything else is reported as "not an object
 * graph" rather than presented as a reading.
 */
function asObject(text) {
    let value;
    try {
        value = decode({ notation: text });
    } catch (error) {
        return `Not an object graph: ${error.message}`;
    }
    let roundTrip;
    try {
        roundTrip = encode({ obj: value });
    } catch (error) {
        return `Not an object graph: it does not encode back (${error.message})`;
    }
    if (roundTrip.trim() !== text.trim()) {
        return "Not an object graph: the codec reads notation it wrote itself, "
            + "and re-encoding this document does not reproduce it.";
    }
    return JSON.stringify(value, null, 2);
}

function panel(title, body) {
    return `${title}\n${"-".repeat(title.length)}\n${body}\n`;
}

function render(text) {
    const links = parser.parse(text);
    return [
        panel(`Parsed structure (${links.length} top-level ${links.length === 1 ? "link" : "links"})`,
            JSON.stringify(links.map(toPlain), null, 2)),
        panel("Formatted back to notation", formatLinks(links)),
        panel("Read as JSON by lino-objects-codec", asObject(text))
    ].join("\n");
}

function initializePlayground() {
    const input = document.getElementById("input");
    const output = document.getElementById("output");
    const parseButton = document.getElementById("parse-btn");

    if (!input || !output) {
        return;
    }

    let timer = null;

    const run = () => {
        const text = input.value.trim();
        if (!text) {
            output.textContent = "Enter some Links Notation to see the parsed result...";
            return;
        }
        try {
            output.textContent = render(text);
        } catch (error) {
            output.textContent = `Parse error: ${error.message}`;
        }
    };

    parseButton?.addEventListener("click", run);
    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(run, 300);
    });

    run();
}

/** Show the version of the library this page was built against. */
function initializeVersion() {
    const target = document.getElementById("version");
    if (target) {
        target.textContent = `v${__LIBRARY_VERSION__}`;
    }
}

/** Fill in the sample the "JSON to notation" card shows, from the codec. */
function initializeCodecSample() {
    const target = document.getElementById("codec-sample");
    if (!target) {
        return;
    }
    const object = { empInfo: { employees: [{ name: "James Kirk", age: 40 }] } };
    target.textContent = encode({ obj: object }).trimEnd();
}

function initializeNavigation() {
    const navToggle = document.querySelector(".nav-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (!navToggle || !navLinks) {
        return;
    }

    const close = () => {
        navLinks.classList.remove("active");
        navToggle.setAttribute("aria-expanded", "false");
    };

    navToggle.addEventListener("click", () => {
        const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!isExpanded));
        navLinks.classList.toggle("active");
    });

    navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));

    document.addEventListener("click", (event) => {
        if (!navToggle.contains(event.target) && !navLinks.contains(event.target)) {
            close();
        }
    });
}

function initializeSmoothScrolling() {
    document.querySelectorAll("a[href^=\"#\"]").forEach((anchor) => {
        anchor.addEventListener("click", (event) => {
            const target = document.querySelector(anchor.getAttribute("href"));
            if (target) {
                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    });
}

function initializeScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll(".feature, .example-card, .doc-card").forEach((element) => {
        element.style.opacity = "0";
        element.style.transform = "translateY(20px)";
        element.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        observer.observe(element);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeVersion();
    initializePlayground();
    initializeCodecSample();
    initializeNavigation();
    initializeSmoothScrolling();
    initializeScrollAnimation();
});
