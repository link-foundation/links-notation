//! Errors from binary links notation codecs.

use std::{error::Error, fmt, io};

/// A failure while encoding or decoding a packet or LiNo document.
#[derive(Debug)]
pub enum BinaryError {
    Io(io::Error),
    Malformed(String),
    InvalidLino(String),
    LimitExceeded(String),
    Unencodable(String),
}

impl BinaryError {
    pub(crate) fn malformed(message: impl Into<String>) -> Self {
        Self::Malformed(message.into())
    }
}

impl fmt::Display for BinaryError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (kind, detail) = match self {
            Self::Io(error) => return write!(f, "I/O error: {error}"),
            Self::Malformed(detail) => ("malformed message", detail),
            Self::InvalidLino(detail) => ("invalid LiNo", detail),
            Self::LimitExceeded(detail) => ("limit exceeded", detail),
            Self::Unencodable(detail) => ("cannot encode", detail),
        };
        write!(f, "{kind}: {detail}")
    }
}

impl Error for BinaryError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Io(error) => Some(error),
            _ => None,
        }
    }
}

impl From<io::Error> for BinaryError {
    fn from(error: io::Error) -> Self {
        Self::Io(error)
    }
}

/// Result returned by the binary codecs.
pub type BinaryResult<T> = Result<T, BinaryError>;
