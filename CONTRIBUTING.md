<p align="center">
  <a href="CONTRIBUTING.md">English</a> |
  <a href="CONTRIBUTING.zh-CN.md">简体中文</a>
</p>

# Contributing to ArchiveDesk

Thanks for taking the time to make ArchiveDesk better.

You do not need to arrive with a major feature. Reporting a problem you found during real use, fixing a line of documentation, adding a test, or smoothing out a small interaction can all make a meaningful difference.

## Where to Start

- Found a problem? Open an [Issue](https://github.com/MoShuYG/ArchiveDesk/issues)
- Have an idea for a feature or interaction? An Issue is a good place to talk it through
- Already have a focused fix? Feel free to open a [Pull Request](https://github.com/MoShuYG/ArchiveDesk/pulls)
- Scanning, search, previews, Windows file handling, and documentation are all useful areas to work on

If you are not sure where to begin, browse the existing Issues and look for something familiar or interesting.

## Reporting an Issue

Before opening a new Issue, take a quick look through the existing ones in case the problem has already been reported. If it has not, include as much of the following as you can:

- Your Windows and Node.js versions
- The page or feature where the problem occurred
- Steps that reproduce the problem
- What happened and what you expected instead
- Relevant screenshots, logs, or error messages
- The file format involved, and whether the problem happens with only one file

There is no need to make the report formal. Clear reproduction details are what matter most.

## Suggesting a Feature

A useful feature request does not need a complete design. Tell us what feels difficult today, what problem you want to solve, and how you would like the workflow to feel.

For large refactors, major new dependencies, cross-platform work, or changes to the product direction, please open an Issue before writing the code. It is easier to align on the approach early, and it helps avoid duplicated work.

## Opening a Pull Request

Keeping a change focused makes it easier to review and merge:

- Let each PR solve one clear problem
- Keep unrelated refactors out of the change
- Explain why the change is needed and how behavior changes
- For bug fixes, include reproduction steps and verification results
- For interface changes, include a screenshot or a short visual description
- Add or update tests when behavior changes

## Before You Submit

For backend changes, run at least:

```bash
npm test
npm run lint
```

For frontend changes, also run:

```bash
npm run lint:frontend
npm run build:frontend
```

If your change touches folder selection, scanning, previews, or opening files in external applications, please walk through the affected workflow on Windows 10 or Windows 11 when possible.

Thanks for contributing.
