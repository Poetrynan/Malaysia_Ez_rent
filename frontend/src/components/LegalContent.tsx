'use client';

import React from 'react';
import { X, FileText, Shield } from 'lucide-react';
import { useApp } from '@/lib/ThemeProvider';

type LegalType = 'terms' | 'privacy';

export default function LegalContent({ type, onClose }: { type: LegalType; onClose: () => void }) {
  const { lang } = useApp();
  const isTerms = type === 'terms';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-surface-solid)', border: '1px solid var(--glass-border)', borderRadius: 16, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          {isTerms ? <FileText size={20} style={{ color: 'var(--primary)' }} /> : <Shield size={20} style={{ color: 'var(--primary)' }} />}
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-h)', margin: 0, flex: 1 }}>
            {isTerms
              ? (lang === 'zh' ? '服务条款' : 'Terms of Service')
              : (lang === 'zh' ? '隐私政策' : 'Privacy Policy')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', fontSize: '0.82rem', lineHeight: 1.8, color: 'var(--text-body)' }}>
          {isTerms ? <TermsContent lang={lang} /> : <PrivacyContent lang={lang} />}
        </div>
      </div>
    </div>
  );
}

/* ────────────────── TERMS OF SERVICE ────────────────── */

function TermsContent({ lang }: { lang: string }) {
  if (lang === 'zh') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>最后更新：2026 年 6 月 6 日</p>

      <Section title="1. 服务概述">
        <p>Malaysia Ez Rent（以下简称"本平台"）是一个面向马来西亚留学生及本地租客的 AI 智能租房服务平台。本平台由独立运营团队开发和维护，为租客提供房源浏览、在线表达租房意向、合约管理、在线缴租等功能，同时为持牌中介（REN）提供房源管理、租约创建和收款审核等工具。</p>
        <p>本平台允许未注册用户以游客身份浏览房源信息。游客可以查看房源图片、价格、房型等公开信息，但无法执行收藏、表达意向、在线缴费等操作。注册登录后即可使用完整功能。</p>
        <p>使用本平台即表示您同意受本服务条款的约束。如果您不同意本条款，请勿使用本平台。</p>
      </Section>

      <Section title="2. 账户注册与安全">
        <p>2.1 本平台支持 Google OAuth 和 Magic Link（邮箱验证码）两种登录方式。注册即自动创建您的账户。</p>
        <p>2.2 您有责任妥善保管您的账户凭证。因您自身原因导致的账户被盗用或密码泄露，本平台不承担责任。</p>
        <p>2.3 中介用户需通过独立的注册流程，提交有效 REN（Real Estate Negotiator）牌照编号及相关证件，经超级管理员审核通过后方可获得中介权限。</p>
        <p>2.4 本平台保留对涉嫌违规账户进行暂停或永久封禁的权利。</p>
      </Section>

      <Section title="3. 用户行为规范">
        <p>3.1 租客用户承诺提供真实、准确的个人信息（包括但不限于姓名、联系方式、学生证/护照/身份证件）。</p>
        <p>3.2 租客用户通过平台提交的租房意向（Interest）具有真实性约束。恶意提交虚假意向、反复提交后无故取消、或利用平台进行骚扰行为，将被限制使用相关功能。</p>
        <p>3.3 中介用户承诺所发布的房源信息真实、合法，不包含虚假描述、误导性图片或未经授权的他人房产信息。</p>
        <p>3.4 严禁利用本平台从事任何违反马来西亚法律的行为，包括但不限于欺诈、洗钱、骚扰或散布违法信息。</p>
      </Section>

      <Section title="4. 房源信息与租房流程">
        <p>4.1 本平台展示的房源信息由入驻中介自行录入和维护。本平台不对房源信息的准确性、完整性或时效性作出保证。</p>
        <p>4.2 租房意向（Express Interest）仅表示您的租赁意愿，不构成具有法律约束力的合同。正式租约由中介通过平台创建，需双方确认后生效。</p>
        <p>4.3 租金、押金及其他费用以中介创建的正式租约为准。平台显示的金额仅供参考。</p>
      </Section>

      <Section title="5. 支付与费用">
        <p>5.1 本平台提供在线缴租功能，租客可通过银行转账、微信或支付宝完成付款，并上传支付凭证供中介审核。</p>
        <p>5.2 本平台本身不直接收取、持有或处理任何资金。所有款项由租客直接支付给中介（首月）或房东（后续月份），本平台仅为信息展示和凭证传递的中介。</p>
        <p>5.3 支付凭证（如转账截图）仅用于中介确认收款，本平台不会将其用于其他目的。</p>
        <p>5.4 因租客与中介/房东之间就租金、押金退还等产生的任何纠纷，本平台不承担调解或赔偿责任。</p>
      </Section>

      <Section title="6. 智能助手（AI Agent）">
        <p>6.1 本平台内置 AI 智能助手，可提供通勤时间估算、马来西亚政策常识查询、汇率换算、假期查询、小区信息检索和外部房源搜索等辅助功能。</p>
        <p>6.2 AI 助手的回答仅供参考，不构成专业建议。通勤时间、政策信息、房源信息等可能因实时变化而与实际情况存在差异。</p>
        <p>6.3 AI 助手不会访问您的个人租约或财务信息。对话内容仅在当前会话中保留，不会被永久存储。</p>
        <p>6.4 AI 助手可搜索外部租房平台获取房源信息，但不会向您暴露信息来源。搜索结果以平台自有知识形式呈现。</p>
      </Section>

      <Section title="7. 知识产权">
        <p>7.1 本平台的软件代码、界面设计、Logo 及文字内容的知识产权归平台运营方所有。</p>
        <p>7.2 用户上传的房源图片、证件照片等素材的知识产权归原始上传者所有。上传即表示您授予本平台在平台运营范围内展示该素材的非独占许可。</p>
      </Section>

      <Section title="8. 免责声明">
        <p>8.1 本平台按"现状"提供服务，不作任何明示或暗示的保证。</p>
        <p>8.2 本平台不对因网络故障、服务器维护、第三方服务中断等不可抗力导致的服务中断承担责任。</p>
        <p>8.3 租客与中介/房东之间的租赁关系是双方之间的独立法律关系，本平台不是该关系的当事方。</p>
      </Section>

      <Section title="9. 条款修改">
        <p>本平台保留随时修改本服务条款的权利。修改后的条款将在本页面更新，继续使用本平台即视为接受修改后的条款。</p>
      </Section>

      <Section title="10. 适用法律与争议解决">
        <p>本服务条款受马来西亚法律管辖。因本条款引起的任何争议，双方应首先友好协商解决；协商不成的，提交马来西亚法院裁决。</p>
      </Section>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Last updated: June 6, 2026</p>

      <Section title="1. Service Overview">
        <p>Malaysia Ez Rent (the &quot;Platform&quot;) is an AI-powered rental platform serving international students and local tenants in Malaysia. The Platform is independently developed and maintained, providing tenants with property browsing, online rental interest expression, lease management, and online rent payment, while offering licensed agents (REN) tools for property management, lease creation, and payment verification.</p>
        <p>The Platform allows unregistered users to browse property listings as guests. Guests may view property photos, pricing, room types, and other public information, but cannot perform actions such as saving favorites, expressing rental interests, or making online payments. Full functionality is available after registration and login.</p>
        <p>By using this Platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.</p>
      </Section>

      <Section title="2. Account Registration &amp; Security">
        <p>2.1 The Platform supports Google OAuth and Magic Link (email verification code) login methods. Registration automatically creates your account.</p>
        <p>2.2 You are responsible for safeguarding your account credentials. The Platform is not liable for unauthorized access caused by your own negligence.</p>
        <p>2.3 Agent users must complete a separate registration process, submitting a valid REN (Real Estate Negotiator) license number and relevant credentials. Agent privileges are granted only after review and approval by a Super Admin.</p>
        <p>2.4 The Platform reserves the right to suspend or permanently ban accounts suspected of violations.</p>
      </Section>

      <Section title="3. User Conduct">
        <p>3.1 Tenant users commit to providing truthful, accurate personal information (including but not limited to name, contact details, student ID/passport/national ID).</p>
        <p>3.2 Rental interests submitted through the Platform are subject to good-faith constraints. Submitting false interests, repeatedly submitting and canceling without cause, or using the Platform for harassment will result in feature restrictions.</p>
        <p>3.3 Agent users commit to publishing property listings that are truthful, lawful, and do not contain false descriptions, misleading images, or unauthorized property information.</p>
        <p>3.4 Using this Platform for any activity that violates Malaysian law is strictly prohibited, including but not limited to fraud, money laundering, harassment, or distribution of illegal content.</p>
      </Section>

      <Section title="4. Property Listings &amp; Rental Process">
        <p>4.1 Property listings on the Platform are created and maintained by onboarded agents. The Platform does not guarantee the accuracy, completeness, or timeliness of listing information.</p>
        <p>4.2 Submitting a rental interest (Express Interest) only indicates your rental intention and does not constitute a legally binding contract. Official leases are created by agents through the Platform and become effective upon mutual confirmation.</p>
        <p>4.3 Rent, deposits, and other fees are as stated in the official lease created by the agent. Amounts displayed on the Platform are for reference only.</p>
      </Section>

      <Section title="5. Payments &amp; Fees">
        <p>5.1 The Platform provides online rent payment functionality. Tenants may pay via bank transfer, WeChat Pay, or Alipay, and upload payment evidence for agent verification.</p>
        <p>5.2 The Platform does not directly collect, hold, or process any funds. All payments are made directly by tenants to agents (first month) or landlords (subsequent months). The Platform serves solely as an information display and evidence relay intermediary.</p>
        <p>5.3 Payment evidence (e.g., transfer screenshots) is used solely for agent payment confirmation and will not be used for other purposes by the Platform.</p>
        <p>5.4 The Platform is not responsible for mediating or compensating any disputes between tenants and agents/landlords regarding rent, deposit refunds, or other financial matters.</p>
      </Section>

      <Section title="6. AI Assistant">
        <p>6.1 The Platform includes an AI assistant that provides commute time estimation, Malaysia policy queries, currency conversion, holiday lookup, community information search, and external listing search as auxiliary features.</p>
        <p>6.2 AI responses are for reference only and do not constitute professional advice. Commute times, policy information, property information, and other data may differ from actual conditions due to real-time changes.</p>
        <p>6.3 The AI assistant does not access your personal lease or financial information. Conversation content is retained only during the current session and is not permanently stored.</p>
        <p>6.4 The AI assistant may search external rental platforms to obtain property information, but will not expose the source of information to you. Search results are presented as the Platform&apos;s own knowledge.</p>
      </Section>

      <Section title="7. Intellectual Property">
        <p>7.1 The Platform&apos;s software code, interface design, logo, and text content are the intellectual property of the Platform operator.</p>
        <p>7.2 User-uploaded materials (property images, credential photos, etc.) remain the intellectual property of the original uploader. Uploading grants the Platform a non-exclusive license to display such materials within the scope of Platform operations.</p>
      </Section>

      <Section title="8. Disclaimer">
        <p>8.1 The Platform is provided &quot;as is&quot; without warranties of any kind, whether express or implied.</p>
        <p>8.2 The Platform is not liable for service interruptions caused by force majeure events including but not limited to network failures, server maintenance, or third-party service disruptions.</p>
        <p>8.3 The rental relationship between tenants and agents/landlords is an independent legal relationship between those parties. The Platform is not a party to such relationship.</p>
      </Section>

      <Section title="9. Amendments">
        <p>The Platform reserves the right to modify these Terms of Service at any time. Updated terms will be posted on this page. Continued use of the Platform constitutes acceptance of the modified terms.</p>
      </Section>

      <Section title="10. Governing Law &amp; Dispute Resolution">
        <p>These Terms of Service are governed by the laws of Malaysia. Any disputes arising from these terms shall first be resolved through amicable negotiation. If negotiation fails, the dispute shall be submitted to the courts of Malaysia for adjudication.</p>
      </Section>
    </div>
  );
}

/* ────────────────── PRIVACY POLICY ────────────────── */

function PrivacyContent({ lang }: { lang: string }) {
  if (lang === 'zh') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>最后更新：2026 年 6 月 6 日</p>

      <Section title="1. 引言">
        <p>Malaysia Ez Rent（以下简称"本平台"）深知个人信息对您的重要性，我们将按照《2010 年个人数据保护法》（Malaysia Personal Data Protection Act 2010, "PDPA"）及相关法律法规的要求，保护您的个人信息安全。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。</p>
      </Section>

      <Section title="2. 我们收集的信息">
        <p><strong>2.0 游客浏览：</strong>未登录用户可以浏览房源信息。游客浏览不会被记录个人信息，浏览行为不会与任何个人身份关联。</p>
        <p><strong>2.1 账户信息：</strong>通过 Google OAuth 或 Magic Link 注册时，我们会获取您的邮箱地址和显示名称。</p>
        <p><strong>2.2 个人资料信息：</strong>您在个人资料页主动填写的姓名、电话号码、学校/公司名称、护照号码或马来西亚身份证号码（IC）、单元号（由中介在创建租约时填入）。</p>
        <p><strong>2.3 证件照片：</strong>您上传的身份证件照片（护照/IC）和学生证照片，用于中介审核租约资格。</p>
        <p><strong>2.4 租赁相关信息：</strong>您提交的租房意向、租约信息（起止日期、租金、押金）、每月付款记录及支付凭证（转账截图）。</p>
        <p><strong>2.5 维修工单：</strong>您提交的维修/反馈工单内容及对话记录。</p>
        <p><strong>2.6 AI 对话：</strong>您与 AI 助手的对话内容仅在当前会话期间临时保留，不会被永久存储。</p>
      </Section>

      <Section title="3. 信息使用目的">
        <p>我们收集的信息仅用于以下目的：</p>
        <p>• 提供房源浏览、租房意向提交、合约管理、在线缴租等核心服务</p>
        <p>• 中介审核您的租约资格和付款凭证</p>
        <p>• 向您发送系统通知、审核结果、合约状态变更等重要消息</p>
        <p>• 改进平台功能和用户体验</p>
        <p>• 防范欺诈和滥用行为</p>
      </Section>

      <Section title="4. 信息存储与安全">
        <p>4.1 您的数据存储在 Supabase（基于 PostgreSQL）云数据库中，部署于安全的数据中心。</p>
        <p>4.2 您上传的图片（房源照片、证件照片、支付凭证）存储在 Supabase Storage 中，通过 HTTPS 加密传输。</p>
        <p>4.3 我们采用行业标准的安全措施保护您的数据，包括行级安全策略（RLS）、传输加密和访问控制。</p>
        <p>4.4 除以下第 5 条所述情况外，我们不会将您的个人信息共享给任何第三方。</p>
      </Section>

      <Section title="5. 信息共享">
        <p><strong>5.1 中介可见信息：</strong>与您有活跃租约关系的中介可以查看您的姓名、电话、邮箱、证件照片和付款凭证，以便进行租约管理和付款审核。</p>
        <p><strong>5.2 超级管理员：</strong>平台超级管理员可以访问所有用户的基本信息（姓名、邮箱、电话），用于平台运维和客服支持。</p>
        <p><strong>5.3 法律要求：</strong>在法律法规要求或响应合法的政府机关要求时，我们可能需要披露您的信息。</p>
        <p><strong>5.4 我们不会：</strong>将您的个人信息出售给第三方、用于广告定向投放、或与营销公司共享。</p>
      </Section>

      <Section title="6. 您的权利（PDPA 权利）">
        <p>根据马来西亚 PDPA，您享有以下权利：</p>
        <p><strong>6.1 访问权：</strong>您有权要求我们提供我们所持有的关于您的个人信息副本。</p>
        <p><strong>6.2 更正权：</strong>您有权要求我们更正任何不准确的个人信息。您可通过个人资料页自行修改大部分信息。</p>
        <p><strong>6.3 撤回同意权：</strong>您有权随时撤回对我们处理您个人信息的同意。撤回同意后，我们将停止处理您的个人信息，但这可能影响我们为您提供服务的能力。</p>
        <p><strong>6.4 删除权：</strong>您有权要求我们删除您的个人信息。您可通过平台的"注销账户"功能自助删除，或联系我们执行。</p>
      </Section>

      <Section title="7. 账户注销与数据删除">
        <p>7.1 您可通过平台的"账户注销"功能主动删除您的账户和个人数据。</p>
        <p>7.2 注销后，以下数据将被永久删除：个人资料、租房意向、维修工单、中介注册记录。</p>
        <p>7.3 以下数据将予以保留（因法律和财务记录需要）：租约合同、付款记录。保留数据将不再与您的可识别个人身份关联。</p>
        <p>7.4 Supabase Authentication 账户将通过服务端 API 彻底删除。</p>
      </Section>

      <Section title="8. Cookie 与本地存储">
        <p>8.1 本平台使用浏览器 localStorage 和 sessionStorage 维持登录状态和用户偏好设置。</p>
      </Section>

      <Section title="9. 第三方服务">
        <p>本平台使用以下第三方服务，它们各自有独立的隐私政策：</p>
        <p>• <strong>Supabase：</strong>数据库和身份认证（隐私政策：supabase.com/privacy）</p>
        <p>• <strong>Google OAuth：</strong>登录认证（隐私政策：policies.google.com/privacy）</p>
        <p>• <strong>Google Maps：</strong>地图显示和通勤计算（隐私政策：policies.google.com/privacy）</p>
        <p>• <strong>AI 推理服务：</strong>AI 助手推理和向量检索（隐私政策取决于具体服务提供商）</p>
        <p>• <strong>Tavily：</strong>AI 助手联网搜索（隐私政策：tavily.com/privacy）</p>
      </Section>

      <Section title="10. 未成年人保护">
        <p>本平台不面向 18 周岁以下的未成年人提供服务。如果您未满 18 周岁，请勿注册或使用本平台。</p>
      </Section>

      <Section title="11. 隐私政策修改">
        <p>我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，并更新"最后更新"日期。重大变更时，我们将通过平台通知告知您。</p>
      </Section>

      <Section title="12. 联系我们">
        <p>如果您对本隐私政策有任何疑问，或希望行使您的 PDPA 权利，请通过以下方式联系我们：</p>
        <p>• 平台内反馈功能</p>
        <p>• 邮箱：poetrynan@163.com</p>
        <p style={{ marginTop: 8, padding: '8px 12px', background: 'var(--primary-light)', borderRadius: 8, border: '1px solid var(--primary-glow)' }}>
          💼 如有合作意向或收购本平台，请联系：poetrynan@163.com
        </p>
      </Section>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Last updated: June 6, 2026</p>

      <Section title="1. Introduction">
        <p>Malaysia Ez Rent (the &quot;Platform&quot;) values the importance of your personal information. We protect your personal data in accordance with the Malaysia Personal Data Protection Act 2010 (&quot;PDPA&quot;) and related regulations. This Privacy Policy explains how we collect, use, store, and protect your personal information.</p>
      </Section>

      <Section title="2. Information We Collect">
        <p><strong>2.0 Guest Browsing:</strong> Unregistered users may browse property listings as guests. Guest browsing is not recorded and is not associated with any personal identity.</p>
        <p><strong>2.1 Account Information:</strong> When you register via Google OAuth or Magic Link, we obtain your email address and display name.</p>
        <p><strong>2.2 Profile Information:</strong> Information you voluntarily provide on your profile page, including name, phone number, school/company name, passport number or Malaysian IC number, and unit number (set by your agent when creating a lease).</p>
        <p><strong>2.3 Credential Photos:</strong> ID document photos (passport/IC) and student card photos you upload for agent lease qualification review.</p>
        <p><strong>2.4 Rental-Related Information:</strong> Rental interests you submit, lease details (start/end dates, rent, deposits), monthly payment records, and payment evidence (transfer screenshots).</p>
        <p><strong>2.5 Maintenance Requests:</strong> Repair/feedback ticket content and conversation records you submit.</p>
        <p><strong>2.6 AI Conversations:</strong> Your conversations with the AI assistant are retained temporarily during the current session only and are not permanently stored.</p>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>We use collected information solely for the following purposes:</p>
        <p>&bull; Providing core services: property browsing, rental interest submission, lease management, and online rent payment</p>
        <p>&bull; Agent review of your lease qualifications and payment evidence</p>
        <p>&bull; Sending system notifications, review results, and lease status changes</p>
        <p>&bull; Improving platform functionality and user experience</p>
        <p>&bull; Preventing fraud and abuse</p>
      </Section>

      <Section title="4. Data Storage &amp; Security">
        <p>4.1 Your data is stored in Supabase (PostgreSQL-based) cloud databases, hosted in secure data centers.</p>
        <p>4.2 Images you upload (property photos, credential photos, payment evidence) are stored in Supabase Storage with HTTPS encrypted transmission.</p>
        <p>4.3 We employ industry-standard security measures including Row-Level Security (RLS), encryption in transit, and access controls.</p>
        <p>4.4 Except as described in Section 5 below, we do not share your personal information with any third parties.</p>
      </Section>

      <Section title="5. Information Sharing">
        <p><strong>5.1 Agent Access:</strong> Agents with whom you have an active lease relationship may view your name, phone, email, credential photos, and payment evidence for lease management and payment verification purposes.</p>
        <p><strong>5.2 Super Admin:</strong> Platform Super Admins may access basic user information (name, email, phone) for platform operations and customer support.</p>
        <p><strong>5.3 Legal Requirements:</strong> We may disclose your information when required by law or in response to lawful government requests.</p>
        <p><strong>5.4 We do NOT:</strong> Sell your personal information to third parties, use it for advertising targeting, or share it with marketing companies.</p>
      </Section>

      <Section title="6. Your Rights (PDPA Rights)">
        <p>Under the Malaysia PDPA, you have the following rights:</p>
        <p><strong>6.1 Right of Access:</strong> You may request a copy of the personal information we hold about you.</p>
        <p><strong>6.2 Right of Correction:</strong> You may request correction of any inaccurate personal information. You can modify most information yourself through the profile page.</p>
        <p><strong>6.3 Right to Withdraw Consent:</strong> You may withdraw your consent for our processing of your personal information at any time. Withdrawal may affect our ability to provide services to you.</p>
        <p><strong>6.4 Right to Deletion:</strong> You may request deletion of your personal information. You can self-delete via the &quot;Delete Account&quot; feature or contact us to do so.</p>
      </Section>

      <Section title="7. Account Deletion &amp; Data Removal">
        <p>7.1 You may proactively delete your account and personal data via the platform&apos;s &quot;Delete Account&quot; feature.</p>
        <p>7.2 After deletion, the following data is permanently removed: profile information, rental interests, maintenance requests, agent registration records.</p>
        <p>7.3 The following data is retained (for legal and financial record-keeping): lease contracts, payment records. Retained data will no longer be associated with your identifiable personal identity.</p>
        <p>7.4 Your Supabase Authentication account is permanently deleted via server-side API.</p>
      </Section>

      <Section title="8. Cookies &amp; Local Storage">
        <p>8.1 The Platform uses browser localStorage and sessionStorage to maintain login state and user preferences.</p>
      </Section>

      <Section title="9. Third-Party Services">
        <p>The Platform uses the following third-party services, each with its own privacy policy:</p>
        <p>&bull; <strong>Supabase:</strong> Database and authentication (privacy: supabase.com/privacy)</p>
        <p>&bull; <strong>Google OAuth:</strong> Login authentication (privacy: policies.google.com/privacy)</p>
        <p>&bull; <strong>Google Maps:</strong> Map display and commute calculation (privacy: policies.google.com/privacy)</p>
        <p>&bull; <strong>AI Inference Services:</strong> AI assistant reasoning and vector search (privacy depends on specific provider)</p>
        <p>&bull; <strong>Tavily:</strong> AI assistant web search (privacy: tavily.com/privacy)</p>
      </Section>

      <Section title="10. Children&apos;s Protection">
        <p>This Platform is not intended for users under the age of 18. If you are under 18, please do not register or use this Platform.</p>
      </Section>

      <Section title="11. Policy Updates">
        <p>We may update this Privacy Policy from time to time. Updated policies will be posted on this page with an updated &quot;Last Updated&quot; date. For significant changes, we will notify you through platform notifications.</p>
      </Section>

      <Section title="12. Contact Us">
        <p>If you have questions about this Privacy Policy or wish to exercise your PDPA rights, please contact us via:</p>
        <p>&bull; The in-platform feedback feature</p>
        <p>&bull; Email: poetrynan@163.com</p>
        <p style={{ marginTop: 8, padding: '8px 12px', background: 'var(--primary-light)', borderRadius: 8, border: '1px solid var(--primary-glow)' }}>
          💼 For partnership or acquisition inquiries, please contact: poetrynan@163.com
        </p>
      </Section>
    </div>
  );
}

/* ── Helper ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-h)', margin: '0 0 8px' }}>{title}</h3>
      <div style={{ color: 'var(--text-body)' }}>{children}</div>
    </div>
  );
}
