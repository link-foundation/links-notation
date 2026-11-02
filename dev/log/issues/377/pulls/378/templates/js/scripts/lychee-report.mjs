/** Require a real summary before either fallback can turn failures green. */
export function validateLycheeReport(
  content,
  hasFailures,
  checkerFailed = false
) {
  const heading = /^# (?:Link Checker Report|Summary)[ \t]*\r?$/m.test(content);
  const errors =
    /^\|[^|\r\n]*\bErrors[ \t]*\|[ \t]*\d+[ \t]*\|[ \t]*\r?$/m.test(content);
  const reportedFailure =
    /^\|[^|\r\n]*\b(?:Errors|Timeouts|Unknown)[ \t]*\|[ \t]*[1-9]\d*[ \t]*\|[ \t]*\r?$/m.test(
      content
    );
  if (
    !heading ||
    !errors ||
    Boolean(hasFailures) !== reportedFailure ||
    (checkerFailed && !hasFailures)
  ) {
    throw new Error(
      'Lychee report is empty, malformed, or contains no evidence for the failed checker'
    );
  }
}
