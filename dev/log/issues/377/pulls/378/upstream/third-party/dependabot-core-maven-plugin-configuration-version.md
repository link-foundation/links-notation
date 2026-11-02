# Maven: bumping a plugin also rewrites a `<version>` with the same value inside that plugin's `<configuration>`

### Is there an existing issue for this?

- [x] I have searched the existing issues. Searches for "requireMavenVersion", "maven-enforcer-plugin" and "maven ... same version" found nothing related.

### Package ecosystem

Maven

### Package manager version

Maven 3.6.3 (`.mvn/wrapper/maven-wrapper.properties`), maven-enforcer-plugin 3.6.3 → 3.7.0

### Language version

Java 8 (the release target), JDK 21 build

### Manifest location and content before the Dependabot update

`java/pom.xml` in https://github.com/link-foundation/links-notation (public). Trimmed:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-enforcer-plugin</artifactId>
    <version>3.6.3</version>
    <executions>
        <execution>
            <id>require-maven</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <requireMavenVersion>
                        <version>3.6.3</version>
                    </requireMavenVersion>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

The plugin version and the minimum Maven version happened to be the same string.

### dependabot.yml content

```yaml
version: 2
updates:
  - package-ecosystem: "maven"
    directory: "/java"
    schedule:
      interval: "daily"
```

### Updated dependency

`org.apache.maven.plugins:maven-enforcer-plugin` 3.6.3 → 3.7.0

### What you expected to see, versus what you actually saw

Expected: only the plugin's own `<version>` changes.

Actual: both `<version>3.6.3</version>` lines changed (pull request https://github.com/link-foundation/links-notation/pull/363):

```diff
                 <artifactId>maven-enforcer-plugin</artifactId>
-                <version>3.6.3</version>
+                <version>3.7.0</version>
@@
                                 <requireMavenVersion>
-                                    <version>3.6.3</version>
+                                    <version>3.7.0</version>
                                 </requireMavenVersion>
```

The second change is not a dependency update. It silently raised the project's minimum Maven version from 3.6.3 to 3.7.0, a Maven release that does not exist. The build that tests the floor then failed with `Detected Maven Version: 3.6.3 is not in the allowed range [3.7.0,)` (https://github.com/link-foundation/links-notation/actions/runs/41439729658).

### Cause

`Dependabot::Maven::FileUpdater#updated_file_declaration` (`maven/lib/dependabot/maven/file_updater.rb`, lines 327-334 at 253cba827e22be90403ce312990a1a4e89defd3e) replaces every occurrence of the old version in the whole declaration string:

```ruby
old_declaration.gsub(
  /(?<=\s|>)#{Regexp.quote(original_req_string)}(?=\s|<)/,
  T.must(requirement.requirement_string)
)
```

For a plugin, `DeclarationFinder#declaration_strings` returns the whole `<plugin>` node, including `<executions>` and `<configuration>`. So any value in the plugin's configuration that equals the old version is rewritten too: `requireMavenVersion`, `requireJavaVersion`, a `<target>`/`<release>`, a `<version>` of a tool the plugin downloads, and so on.

### Native package manager behavior

`mvn versions:use-latest-releases` / `versions:set-property` only change the plugin's `<version>` child.

### Smallest manifest that reproduces the issue

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>example</groupId>
  <artifactId>repro</artifactId>
  <version>1.0.0</version>
  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-enforcer-plugin</artifactId>
        <version>3.6.3</version>
        <executions>
          <execution>
            <id>require-maven</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
              <rules>
                <requireMavenVersion><version>3.6.3</version></requireMavenVersion>
              </rules>
            </configuration>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
```

A Dependabot version update for maven-enforcer-plugin changes both `3.6.3` literals.

### Workaround

Write the configuration value so that it cannot equal a plugin version. The enforcer reads the range `[3.6.3,)` the same way as `3.6.3`, so links-notation now declares `<version>[3.6.3,)</version>` (https://github.com/link-foundation/links-notation/pull/378). Moving the value into a `<properties>` entry with a different name also works.

### Suggested fix

Only rewrite the version of the dependency itself: the direct `<version>` child of the `<plugin>`/`<dependency>`/`<extension>` node, or the property it references. For example, in `updated_file_declaration`, parse the declaration and change only that child:

```ruby
def updated_file_declaration(old_declaration, previous_req, requirement)
  original_req_string = T.must(previous_req.requirement_string)
  # Only the declaration's own <version>: nested <configuration> values
  # (requireMavenVersion, release, ...) can hold the same text.
  own_version = %r{\A(.*?<version>\s*)#{Regexp.quote(original_req_string)}(\s*</version>)}m
  head = old_declaration[/\A.*?(?=<(?:executions|configuration|dependencies)>|\z)/m]
  return old_declaration unless head&.match?(own_version)

  old_declaration.sub(own_version) { "#{Regexp.last_match(1)}#{requirement.requirement_string}#{Regexp.last_match(2)}" }
end
```

A spec with the pom above should assert that `requireMavenVersion` keeps `3.6.3`.
