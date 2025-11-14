"""Test script to verify timeout works correctly."""

import time
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python'))

from links_notation import Parser


def test_normal_operation():
    """Test that should complete quickly."""
    parser = Parser()
    result = parser.parse('(test: value1 value2)')
    assert len(result) == 1
    assert result[0].id == 'test'
    print("✓ Normal test passed")


def test_timeout_simulation():
    """Test that simulates long-running operation (will timeout with pytest-timeout)."""
    # This test should timeout after 60 seconds when run with pytest-timeout
    print("Starting long-running test (will timeout)...")
    time.sleep(65)  # Sleep for 65 seconds, exceeding the 60-second timeout
    assert False, "This should not be reached due to timeout"


if __name__ == '__main__':
    test_normal_operation()
    print("\n⚠️  To test timeout behavior, run with pytest:")
    print("    pytest experiments/test_timeout_verification.py::test_timeout_simulation --timeout=5")
