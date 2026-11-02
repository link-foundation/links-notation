"""Conan 2 recipe for my_package.

Build and test the package locally (this is what CI runs):

    conan create . --build=missing

The version is read from ``project(VERSION ...)`` in CMakeLists.txt, so there
is nothing to bump here. Publishing to a remote is done by the release
workflow when the ``CONAN_REMOTE_URL`` variable and ``CONAN_LOGIN_USERNAME`` /
``CONAN_PASSWORD`` secrets are configured (see docs/distribution.md).
"""

import os
import re

from conan import ConanFile
from conan.tools.build import check_min_cppstd
from conan.tools.cmake import CMake, CMakeToolchain, cmake_layout
from conan.tools.files import copy, load, rmdir

required_conan_version = ">=2.0"


class MyPackageConan(ConanFile):
    name = "my_package"
    description = "Example header-only C++ library of the AI-driven development pipeline template"
    license = "Unlicense"
    url = "https://github.com/link-foundation/cpp-ai-driven-development-pipeline-template"
    homepage = url
    topics = ("header-only", "template", "ci-cd")
    package_type = "header-library"
    settings = "os", "arch", "compiler", "build_type"
    no_copy_source = True
    exports_sources = (
        "CMakeLists.txt",
        "cmake/*",
        "include/*",
        "LICENSE",
    )

    def set_version(self):
        cmakelists = load(self, os.path.join(self.recipe_folder, "CMakeLists.txt"))
        match = re.search(r"project\s*\([^)]*?\bVERSION\s+(\d+\.\d+\.\d+)", cmakelists, re.S)
        if match is None:
            raise ValueError("Cannot find project(VERSION ...) in CMakeLists.txt")
        self.version = match.group(1)

    def layout(self):
        cmake_layout(self)

    def validate(self):
        check_min_cppstd(self, 20)

    def generate(self):
        toolchain = CMakeToolchain(self)
        toolchain.cache_variables["MY_PACKAGE_BUILD_TESTS"] = False
        toolchain.cache_variables["MY_PACKAGE_BUILD_EXAMPLES"] = False
        toolchain.cache_variables["MY_PACKAGE_BUILD_DOCS"] = False
        toolchain.cache_variables["MY_PACKAGE_INSTALL"] = True
        toolchain.generate()

    def build(self):
        cmake = CMake(self)
        cmake.configure()

    def package(self):
        # Reuse the project's own install rules so the Conan package contains
        # exactly the same files as `cmake --install` and the release archive.
        cmake = CMake(self)
        cmake.install()
        # Consumers get their config files from CMakeDeps / PkgConfigDeps and
        # Conan expects the license under licenses/.
        rmdir(self, os.path.join(self.package_folder, "share"))
        copy(self, "LICENSE", self.source_folder, os.path.join(self.package_folder, "licenses"))

    def package_id(self):
        self.info.clear()

    def package_info(self):
        self.cpp_info.set_property("cmake_file_name", "my_package")
        self.cpp_info.set_property("cmake_target_name", "my_package::my_package")
        self.cpp_info.set_property("pkg_config_name", "my_package")
        self.cpp_info.bindirs = []
        self.cpp_info.libdirs = []
