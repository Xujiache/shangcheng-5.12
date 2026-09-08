import type { LegalAgreements } from './legal.defaults'

export const LEGAL_AGREEMENTS_EN_KEY = 'legal_agreements_en'

export const DEFAULT_LEGAL_AGREEMENTS_EN: LegalAgreements = {
  user: {
    title: 'Jingwei Technology Terms of Service',
    updatedAt: '2026-05-13',
    body: `# Jingwei Technology Terms of Service

**Effective date: May 13, 2026**

Welcome to Jingwei Technology. These Terms form a legally binding agreement between you and the operator of the platform for registration, sign-in and use of all products and services provided by the platform.

Read these Terms carefully before using the service, especially provisions that may materially affect your rights. Selecting “I have read and agree,” registering, signing in or otherwise using the service means that you have read, understood and accepted these Terms.

## 1. Scope and eligible users

1. These Terms are entered into between you and the lawful operator of the platform in the People’s Republic of China.
2. A particular feature may have additional terms or operating rules. Those terms and rules form part of this agreement.

## 2. Account registration and use

1. **Eligibility:** You must have the legal capacity required for the relevant activity. A person with limited or no civil capacity must use the service with a guardian.
2. **Accurate information:** Registration and merchant information must be true, accurate, complete and kept current.
3. **Account security:** Keep your phone, password and verification information secure. You are responsible for loss caused by disclosure or misuse attributable to you.
4. **Account ownership:** An account may not be transferred, rented, sold, lent or otherwise made available to another person.

## 3. Platform services

1. The platform provides commerce capabilities including product presentation, search, orders, payment, delivery, after-sales support, merchant operations and customer communication.
2. Some services are provided by third-party merchants or partners. The actual provider bears the corresponding legal responsibility.

## 4. Acceptable use

You must comply with applicable laws and public order. You must not:

- publish or transmit unlawful content or content that infringes another person’s rights;
- use the service for fraud, money laundering, pyramid selling, illegal cash-out or other criminal activity;
- perform automated registration, unauthorized scraping, intrusion or disruption of platform systems;
- impersonate another person, fabricate transactions, manipulate reviews or abuse refunds;
- infringe intellectual property, trade secrets or personal privacy.

## 5. Intellectual property

1. Text, images, audiovisual material, software, trademarks and logos supplied by the platform belong to the platform or the relevant rights holder.
2. Without written authorization, you may not reproduce, distribute, modify, republish, compile or commercially exploit protected content.

## 6. Disclaimer

To the maximum extent permitted by law:

1. The platform is not liable for interruption or loss caused by force majeure, government action, network interruption or telecommunications failure.
2. Loss caused by your own fault or a third party is borne by the responsible party.

## 7. Changes to these Terms

We may revise these Terms to reflect legal or operational changes. Revised terms will be announced on the platform and normally take effect seven days after publication. Stop using the service if you do not agree to a revision.

## 8. Governing law and disputes

1. The laws of the People’s Republic of China govern these Terms.
2. The parties should first try to resolve a dispute through consultation. If that fails, either party may bring proceedings before a competent court where the platform operator is located.

## 9. Contact

Contact platform support if you have a question or suggestion about these Terms.`,
  },
  privacy: {
    title: 'Jingwei Technology Privacy Policy',
    updatedAt: '2026-05-13',
    body: `# Jingwei Technology Privacy Policy

**Effective date: May 13, 2026**

We recognize the importance of personal information and protect it in accordance with applicable law. This Policy explains how information is collected, used, stored, shared and protected when you use Jingwei Technology.

## 1. Information we collect

### Information you provide

- **Account information:** phone number, verification code, nickname and avatar;
- **Merchant information:** business identity, qualifications, contact details, store details and operating categories;
- **Order information:** recipient, phone, delivery address, products, after-sales evidence and logistics details;
- **Transaction information:** order amount, payment method, invoice and membership purchase records;
- **Communications:** customer-service messages, images and feedback you submit.

### Information collected when you use the service

- **Device and network information:** device model, operating system, app version, network state and security identifiers permitted by the operating system;
- **Logs:** access time, IP address, operation logs, crash and diagnostic information;
- **Location:** precise or approximate location only after authorization, for map selection, store information and navigation;
- **Push identifier:** a Push Kit token used to deliver order, after-sales and customer-message notifications.

### Information from third parties

When you choose a platform capability such as Huawei IAP Kit, Push Kit, Map Kit, Location Kit or AppGallery, the relevant provider may return the minimum transaction, device or location information needed to complete that feature.

## 2. How we use information

We use information to provide account access, merchant operations, product and order management, payment and reconciliation, delivery, after-sales service, customer support, security and fraud prevention, product improvement and legal compliance.

We do not use precise location, camera, photos or notification access until you trigger the corresponding feature and grant permission. Denial of an optional permission does not disable unrelated core functions.

## 3. Sharing, transfer and disclosure

We share only information necessary for a requested service, including with logistics providers, payment platforms, cloud storage and communications providers. We require service providers to protect information and restrict its use.

We do not transfer personal information unless we obtain consent or a merger, division, acquisition or asset transfer requires a successor to assume the same obligations. We disclose information publicly only with explicit consent or as required by law.

## 4. Storage and security

1. Personal information is stored on servers in the People’s Republic of China unless the law permits otherwise.
2. Information is kept only for the minimum period required for the stated purpose and legal obligations, then deleted or anonymized.
3. We use measures including TLS transport protection, access control, audit logging and secure credential storage. Access and refresh tokens in the HarmonyOS app are stored with Asset Store and are not stored as plaintext passwords.

## 5. Your rights

Subject to law, you may access, copy, correct or request deletion of your information, withdraw consent, manage permissions and notifications, or complain to us or a regulator. Some records must be retained for transaction, tax, dispute or regulatory obligations.

## 6. Children

The service is not directed to children under 14 acting independently. A child must read and use the service with a guardian’s consent and supervision.

## 7. Policy updates

We may update this Policy for legal, technical or product changes. Material changes will be announced through a prominent notice, in-app message or push notification as appropriate.

## 8. Contact

- Support phone: 400-000-0000
- Support email: support@jiujiu.com

We aim to respond to a valid privacy request within 15 working days.`,
  },
  collect: {
    title: 'Jingwei Technology Personal Information Collection List',
    updatedAt: '2026-05-13',
    body: `# Jingwei Technology Personal Information Collection List

**Effective date: May 13, 2026**

This list describes information used in each major scenario and whether it is required.

## 1. Registration and sign-in

| Item | Purpose | Required |
| ---- | ------- | -------- |
| Phone number | Create and verify an account, sign in and recover access | Yes |
| SMS verification code | Verify control of the phone number | For SMS verification |
| Password hash | Password sign-in; the plaintext password is not stored | For password sign-in |
| Nickname and avatar | Display account identity | Optional |

## 2. Merchant operation

| Item | Purpose | Required |
| ---- | ------- | -------- |
| Merchant identity, qualifications and contact details | Merchant review and ongoing compliance | Yes for merchant access |
| Product images, descriptions, prices and stock | Product management and fulfilment | When publishing a product |
| Recipient, phone and address | Order fulfilment and delivery | When handling an order |
| Logistics and after-sales evidence | Delivery, refund and dispute handling | When using the feature |

## 3. Device, media and location

| Item | Purpose | Required |
| ---- | ------- | -------- |
| Device model, OS/app version and network state | Compatibility, security and troubleshooting | Yes |
| Camera and selected photos | Upload products, qualifications or evidence | Only after permission |
| Precise or approximate location | Map selection and store location | Only after permission |
| Push token and notification preference | Order, after-sales and chat alerts | Optional |
| Operation and diagnostic logs | Security, reliability and service improvement | Yes where necessary |

## 4. Payment and membership

| Item | Purpose | Required |
| ---- | ------- | -------- |
| AppGallery product and purchase order identifiers | Complete and reconcile an IAP purchase | When purchasing |
| Signed purchase token and subscription state | Verify entitlement, renewal, cancellation and refund | When purchasing |
| Payment amount and membership plan | Billing, invoices and customer support | When purchasing |

## 5. Platform services

| Service | Purpose | Information involved | Provider |
| ------- | ------- | -------------------- | -------- |
| Huawei Push Kit | Order, after-sales and chat notifications | Push token, device identifier, locale | Huawei |
| Huawei IAP Kit | Membership purchase and subscription management | Product, order and signed purchase data | Huawei |
| Huawei Map Kit / Location Kit | Map selection, geocoding and navigation | Coordinates and address | Huawei |
| Huawei AppGallery | Distribution and app updates | App identifier and version | Huawei |
| Cloud storage and SMS service | Media storage and account verification | Uploaded file or phone number as applicable | Contracted provider |

## 6. Withdrawing authorization

You can revoke camera, photo, location or notification permission in HarmonyOS system settings. Notification categories, language and appearance can also be managed in the app. Revoking an optional permission affects only the related feature.

Contact support at 400-000-0000 if you have a question about collection or use of personal information.`,
  },
}
