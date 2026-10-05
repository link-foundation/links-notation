//! Binary links notation version 1: packets and the marker-point LiNo mapping.
//!
//! Wire specification and shared vectors live in `docs/protocol/` in the
//! repository. This module supplies codecs; transports supply their own framing.
//!
//! ```
//! use links_notation::binary::{parse_document, BinaryLinoCodec};
//! let document = parse_document("() ((1 1))")?;
//! let codec = BinaryLinoCodec::new();
//! let bytes = codec.encode(&document)?;
//! assert_eq!(codec.decode(&bytes)?, document);
//! # Ok::<(), links_notation::binary::BinaryError>(())
//! ```

mod error;
mod format;
mod mapping;
pub mod packet;

pub use error::{BinaryError, BinaryResult};
pub use format::{canonical, format_document, format_link, format_reference, parse_document};
pub use mapping::{decode_document, encode_document, BinaryLinoOptions, LinoDocument};
pub use packet::{ArityRange, DecodeLimits, LinksPacket, Reference, Section};

/// Convenience codec for complete LiNo packets.
#[derive(Clone, Copy, Debug, Default)]
pub struct BinaryLinoCodec {
    pub options: BinaryLinoOptions,
    pub limits: DecodeLimits,
}

impl BinaryLinoCodec {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_options(options: BinaryLinoOptions) -> Self {
        Self {
            options,
            ..Self::default()
        }
    }

    /// Encodes the supplied model without canonicalizing its groups.
    pub fn encode(&self, document: &[crate::LiNo<String>]) -> BinaryResult<Vec<u8>> {
        encode_document(document, self.options)?.to_bytes()
    }

    /// Decodes exactly one complete packet, rejecting trailing bytes.
    pub fn decode(&self, bytes: &[u8]) -> BinaryResult<LinoDocument> {
        decode_document(&LinksPacket::from_bytes(bytes, &self.limits)?, &self.limits)
    }
}
