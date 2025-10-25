#!/usr/bin/env python3
"""
Claude API Integration for GitHub Workflows
Provides helper functions for AI-assisted development workflows
"""

import os
import json
import sys
from typing import Optional, Dict, List
from anthropic import Anthropic


class ClaudeAssistant:
    """Helper class for interacting with Claude API in GitHub Actions"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Claude client

        Args:
            api_key: Anthropic API key (defaults to CLAUDE_API_KEY env var)
        """
        self.api_key = api_key or os.environ.get('CLAUDE_API_KEY')
        if not self.api_key:
            raise ValueError("CLAUDE_API_KEY environment variable not set")

        self.client = Anthropic(api_key=self.api_key)
        self.model = "claude-3-5-sonnet-20241022"

    def generate_spec(self, issue_title: str, issue_body: str, codebase_context: str) -> str:
        """
        Generate technical specification from feature request

        Args:
            issue_title: GitHub issue title
            issue_body: GitHub issue body (from template)
            codebase_context: Summary of codebase structure

        Returns:
            Markdown technical specification
        """
        prompt = f"""You are a technical architect for Ora Admin Portal (Next.js 15 + TypeScript + Firebase).

A feature request has been filed:

**Title**: {issue_title}

**Details**:
{issue_body}

**Codebase Context**:
{codebase_context[:4000]}

Generate a detailed technical specification including:

1. **Overview**: High-level summary
2. **Architecture & Design**: Components, data flow, patterns
3. **API Contracts**: Endpoints, request/response schemas (TypeScript)
4. **Data Models**: Firestore collections/documents with TypeScript interfaces
5. **Security Considerations**: Firestore rules, permissions, validation
6. **Performance Considerations**: Optimizations, caching, scaling
7. **Testing Strategy**: Unit tests, integration tests, E2E scenarios
8. **Implementation Tasks**: Concrete checklist for developers

Format in Markdown with TypeScript code blocks for schemas.
Be specific and actionable. Reference existing patterns in the codebase.
"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        return response.content[0].text

    def analyze_test_failures(self, test_report: Dict) -> str:
        """
        Analyze test failures and suggest fixes

        Args:
            test_report: JSON test report (Vitest or Playwright)

        Returns:
            Markdown analysis with suggested fixes
        """
        # Extract failures
        failures = []

        if 'testResults' in test_report:
            # Vitest format
            for test in test_report.get('testResults', []):
                if test.get('status') == 'failed':
                    failures.append({
                        'file': test.get('name'),
                        'test': test.get('assertionResults', [{}])[0].get('title', 'Unknown'),
                        'error': test.get('message', 'Unknown error')
                    })
        elif 'suites' in test_report:
            # Playwright format
            for suite in test_report.get('suites', []):
                for test in suite.get('specs', []):
                    if test.get('ok') is False:
                        failures.append({
                            'file': suite.get('file'),
                            'test': test.get('title'),
                            'error': test.get('error', {}).get('message', 'Unknown error')
                        })

        if not failures:
            return "✅ No test failures detected"

        prompt = f"""You are debugging test failures in Ora Admin Portal (Next.js 15 + TypeScript + Firebase).

**Test Failures**:
```json
{json.dumps(failures, indent=2)}
```

For each failure, provide:

1. **Root Cause**: What's likely causing this failure?
2. **Suggested Fix**: Specific code changes to resolve it
3. **Prevention**: How to prevent similar issues in the future

Format as Markdown with code blocks for suggested fixes.
Be concise but specific. Reference TypeScript/React best practices.
"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )

        return response.content[0].text

    def review_pr(self, diff: str, pr_description: str) -> str:
        """
        Review PR code changes

        Args:
            diff: Git diff output
            pr_description: PR description

        Returns:
            Markdown review with suggestions
        """
        prompt = f"""You are reviewing a Pull Request for Ora Admin Portal (Next.js 15 + TypeScript + Firebase).

**PR Description**:
{pr_description}

**Code Changes**:
```diff
{diff[:8000]}
```

Review the code and provide:

1. **Summary**: High-level assessment
2. **Potential Issues**: Bugs, security concerns, performance problems
3. **Suggestions**: Improvements for code quality, readability, maintainability
4. **Security**: Any security considerations
5. **Testing**: Are there sufficient tests?

Format as Markdown. Be constructive and specific.
Focus on:
- TypeScript type safety
- React best practices
- Firebase security (Firestore rules, sensitive data)
- Error handling
- Performance implications
"""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )

        return response.content[0].text


def main():
    """CLI entry point for GitHub Actions"""
    import argparse

    parser = argparse.ArgumentParser(description='Claude API helper for GitHub workflows')
    parser.add_argument('command', choices=['spec', 'test-analysis', 'pr-review'],
                        help='Command to execute')
    parser.add_argument('--issue-title', help='GitHub issue title')
    parser.add_argument('--issue-body', help='GitHub issue body')
    parser.add_argument('--codebase-context', help='Codebase summary file path')
    parser.add_argument('--test-report', help='Test report JSON file path')
    parser.add_argument('--diff', help='Git diff file path')
    parser.add_argument('--pr-description', help='PR description')
    parser.add_argument('--output', help='Output file path (default: stdout)')

    args = parser.parse_args()

    try:
        assistant = ClaudeAssistant()
        result = ""

        if args.command == 'spec':
            if not args.issue_title or not args.issue_body:
                print("Error: --issue-title and --issue-body required for spec generation", file=sys.stderr)
                sys.exit(1)

            codebase_context = ""
            if args.codebase_context:
                with open(args.codebase_context, 'r', encoding='utf-8') as f:
                    codebase_context = f.read()

            result = assistant.generate_spec(args.issue_title, args.issue_body, codebase_context)

        elif args.command == 'test-analysis':
            if not args.test_report:
                print("Error: --test-report required for test analysis", file=sys.stderr)
                sys.exit(1)

            with open(args.test_report, 'r', encoding='utf-8') as f:
                test_report = json.load(f)

            result = assistant.analyze_test_failures(test_report)

        elif args.command == 'pr-review':
            if not args.diff or not args.pr_description:
                print("Error: --diff and --pr-description required for PR review", file=sys.stderr)
                sys.exit(1)

            with open(args.diff, 'r', encoding='utf-8') as f:
                diff = f.read()

            result = assistant.review_pr(diff, args.pr_description)

        # Output result
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(result)
            print(f"✅ Output written to {args.output}")
        else:
            print(result)

    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
