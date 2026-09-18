# Contributing

Contributions are welcome! Here's how to get started:

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Syntax check
npm run check
```

## Code Guidelines

- Use Node.js 22.17.0 or higher
- Follow existing code style (functional, modular)
- Add tests for new features
- Ensure all tests pass (`npm test`)
- Lint and syntax check (`npm run check`)

## Testing

```bash
npm test    # Run all 76 tests
npm run check  # Verify syntax
```

## Making Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Add or update tests as needed
5. Ensure tests pass (`npm test`)
6. Commit with clear messages
7. Push to your fork
8. Create a Pull Request

## Commit Message Guidelines

- Start with a verb: `fix:`, `feat:`, `docs:`, `test:`, `refactor:`
- Be descriptive and concise
- Reference any related issues

Example:
```
feat: add multi-timeframe technical analysis

- Add support for 4h and daily candles
- Extend technicalIndicators.js with tf parameter
- Update tests for new functionality

Closes #123
```

## Pull Request Guidelines

- Provide a clear description of changes
- Reference any related issues
- Ensure tests pass
- Verify no breaking changes to public API

## Questions?

Open an issue on GitHub to discuss larger changes before diving into development.

## License

All contributions are MIT licensed. See LICENSE file for details.
