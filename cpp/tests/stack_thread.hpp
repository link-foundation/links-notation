// Runs work on a thread with a stack of a chosen size, the way the Rust tests
// use thread::Builder::stack_size. std::thread cannot choose one.

#ifndef LINKS_NOTATION_STACK_THREAD_HPP
#define LINKS_NOTATION_STACK_THREAD_HPP

#include <cstddef>
#include <exception>
#include <functional>
#include <stdexcept>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#else
#include <pthread.h>
#endif

namespace links_notation_test {

namespace detail {

struct StackThreadState {
  const std::function<void()>* work;
  std::exception_ptr failure;
};

inline void run_stack_thread_state(StackThreadState& state) {
  try {
    (*state.work)();
  } catch (...) {
    state.failure = std::current_exception();
  }
}

#ifdef _WIN32
inline DWORD WINAPI stack_thread_entry(LPVOID argument) {
  run_stack_thread_state(*static_cast<StackThreadState*>(argument));
  return 0;
}
#else
inline void* stack_thread_entry(void* argument) {
  run_stack_thread_state(*static_cast<StackThreadState*>(argument));
  return nullptr;
}
#endif

}  // namespace detail

/// Runs `work` on a new thread with a stack of `stack_size` bytes, waits for
/// it, and rethrows what it threw.
inline void run_on_stack(std::size_t stack_size, const std::function<void()>& work) {
  detail::StackThreadState state{&work, nullptr};
#ifdef _WIN32
  HANDLE thread = CreateThread(nullptr, stack_size, detail::stack_thread_entry, &state,
                               STACK_SIZE_PARAM_IS_A_RESERVATION, nullptr);
  if (thread == nullptr) throw std::runtime_error("cannot start a thread");
  WaitForSingleObject(thread, INFINITE);
  CloseHandle(thread);
#else
  pthread_attr_t attributes;
  pthread_attr_init(&attributes);
  pthread_attr_setstacksize(&attributes, stack_size);
  pthread_t thread;
  const int created = pthread_create(&thread, &attributes, detail::stack_thread_entry, &state);
  pthread_attr_destroy(&attributes);
  if (created != 0) throw std::runtime_error("cannot start a thread");
  pthread_join(thread, nullptr);
#endif
  if (state.failure) std::rethrow_exception(state.failure);
}

}  // namespace links_notation_test

#endif  // LINKS_NOTATION_STACK_THREAD_HPP
