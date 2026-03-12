# Security Policy / 安全策略

Thank you for helping keep ArchiveDesk and its users secure.  
感谢你帮助 ArchiveDesk 及其用户保持安全。

This document explains which versions are supported, how to report a vulnerability, and how security reports will be handled.  
本文档说明支持范围、漏洞报告方式，以及维护者处理安全问题的基本流程。

---

## Supported Versions / 支持版本

ArchiveDesk is currently in an early development stage.  
ArchiveDesk 目前仍处于早期开发阶段。

At this time, we do not guarantee long-term support for specific old versions.  
当前阶段，我们**不承诺对特定旧版本提供长期支持**。

If security fixes are released, they are most likely to appear in the latest development version or the latest published version.  
如果后续提供安全修复，通常会优先出现在**最新开发版本**或**最新发布版本**中。

---

## Reporting a Vulnerability / 报告安全漏洞

Please **do not** report security vulnerabilities through public GitHub issues, pull requests, or discussions.  
请**不要**通过公开的 GitHub Issue、Pull Request 或 Discussions 报告安全漏洞。

If you believe you have found a security issue, please contact the maintainer privately first.  
如果你认为发现了安全问题，请先通过**私下方式**联系维护者。

Recommended report content:  
建议在报告中尽量提供以下信息：

- A short description of the issue  
  问题的简要描述
- Steps to reproduce  
  复现步骤
- Affected environment and version  
  受影响的环境和版本
- Possible impact  
  可能造成的影响
- Logs, screenshots, or proof of concept if available  
  日志、截图或 PoC（如有）

If you do not yet have a dedicated security email, you can temporarily say:  
如果你暂时还没有专门的安全邮箱，可以先这样写：

> Please contact the maintainer privately through GitHub or the project's listed contact channel.  
> 请通过 GitHub 私信或项目公开提供的联系方式私下联系维护者。

---

## Response Expectations / 响应时间

The maintainer will try to acknowledge valid security reports within **7 days**.  
维护者会尽量在 **7 天内**确认有效的安全报告。

Because ArchiveDesk is still early-stage, investigation and fix timelines may vary depending on the issue and maintainer availability.  
由于 ArchiveDesk 仍处于早期阶段，具体调查和修复时间会根据问题复杂度和维护者时间安排而变化。

Security reports will be taken seriously.  
但安全报告会被认真对待。

---

## Scope / 关注范围

Security-sensitive areas may include, but are not limited to:  
当前项目中较敏感的安全相关范围包括但不限于：

- Local file scanning  
  本地文件扫描
- Metadata extraction  
  元数据提取
- External file opening integrations  
  外部程序打开文件的集成
- Authentication and session handling  
  登录认证与会话处理
- API endpoints  
  服务端接口
- Database access  
  数据库访问

---

## Responsible Disclosure / 负责任披露

Please allow the maintainer a reasonable amount of time to investigate, confirm, and prepare a fix before disclosing the issue publicly.  
在公开披露之前，请给维护者合理时间进行调查、确认和修复准备。

Do not publicly share exploit details before the issue has been reviewed.  
在问题被审查和确认之前，请不要公开发布利用细节。

If the issue is confirmed, the maintainer may choose an appropriate time and way to disclose the fix.  
如果问题被确认，维护者会选择合适的时间和方式公开修复信息。

---

## Notes / 说明

This security policy may be updated as the project matures.  
本安全策略会随着项目的发展逐步更新。

ArchiveDesk is a local-first Windows-focused project, so security decisions may prioritize local safety, privacy, and predictable behavior in desktop workflows.  
ArchiveDesk 是一个面向 Windows 的本地优先项目，因此安全决策会优先考虑本地安全、隐私以及桌面工作流中的可预测行为。
