import * as React from 'react';
import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Language, useLanguage } from './LanguageContext';

interface LanguageTermsContextType {
  t: (key: string) => string;
}

// Terms of Service translations for all 10 languages
const termsTranslations: Record<Language, Record<string, string>> = {
  mn: {
    terms_title: "Үйлчилгээний Нөхцөл",
    terms_close_button: "Хаах",
    terms_section_1: `1. Нөхцөлийг хүлээн зөвшөөрөх
Cn viptravel платформ болон апп (cnviptravel.com)-ыг ашиглах, суулгах, эсвэл хандахдаа та эдгээр Үйлчилгээний Нөхцөл болон бүх хамаарах хууль, дүрмийг хүлээн зөвшөөрч, дагаж мөрдөх ёстой.`,
    terms_section_2: `2. Үйлчилгээний тайлбар
Cn viptravel нь цогц бүрэн стек аялалын платформ юм. Манай үйлчилгээнд дараах зүйлс орно (гэхдээ зөвхөн эдгээрээр хязгаарлагдахгүй):
Хөтөч & Аялал олох: Орон нутгийн болон олон улсын аялалын хөтөч, аяллын маршрутуудыг хайх, харьцуулах, захиалах.
Нэгдсэн Захиалга & Төлбөр: Хөтөч болон гуравдагч этгээдийн корпорац үйлчилгээ (кампийн газар, амралтын газар, тээвэр, ресторан) захиалгыг нэгдсэн төлбөрийн гарц (QPay, SocialPay, кредит карт) ашиглан хялбарчлах.
AI-д суурилсан Харилцаа: Аялагч болон хөтөч хоорондын харилцааг хөнгөвчлөх 10 хэлний орчуулгын үйлчилгээ.
Бодит цагийн Харилцаа: Cloudflare Calls-д суурилсан аюулгүй, бодит цагийн мессеж, аудио, видео дуудлагын үйлчилгээ.
Шууд Дамжуулалт: Хөтөчдүүдэд газраас шууд дамжуулалт хийх боломж.
Интерактив Газрын Зураг: Mapbox гэх мэт технологид суурилсан байршлын үйлчилгээ.
Баталгаажуулалтын Үйлчилгээ: Хөтөчдийн профайлын түүх шалгалт, баталгаажуулалтыг удирдах.`,
    terms_section_3: `3. Гуравдагч этгээдийн үйлчилгээ
Манай платформын зарим онцлогууд Google AI (Gemini API), Cloudflare, Mapbox зэрэг гуравдагч этгээдийн API болон үйлчилгээг ашигладаг. Эдгээр онцлогуудыг ашигласнаар та өөрийн өгөгдөл тэдний нууцлалын бодлого болон үйлчилгээний нөхцөлийн дагуу боловсруулагдаж болохыг хүлээн зөвшөөрнө.`,
    terms_section_4: `4. Төлбөр, цуцлалт
Бүх санхүүгийн гүйлгээ нь манай тодорхой тооцоо, буцаан олголтын бодлогын дагуу явагддаг. Бид төлбөр тооцоог хялбарчлах ч, гуравдагч этгээдийн хөтөч эсвэл корпорац хамтрагчдын (кампийн газар, тээвэр гэх мэт) үйлчилгээний эцсийн хүргэлтийн хариуцлага хүлээхгүй. Цуцлалтын бодлого нь үйлчилгээ үзүүлэгч бүрээр тодорхойлогддог.`,
    terms_section_5: `5. Хариуцлагын хязгаарлалт
Cn viptravel нь зөвхөн завсарлага болон технологийн үйлчилгээ үзүүлэгч юм. Бид AI орчуулгын үнэн зөв байдал, шууд дамжууллын чанар, эсвэл манай платформ эсвэл гуравдагч этгээдийн үйлчилгээг ашигласнаар үүсэх шууд, шууд бус, санамсаргүй, тусгай, эсвэл дагалдах хохирлын хариуцлага хүлээхгүй.`,
    terms_section_6: `6. Хэрэгжүүлэх хууль
Эдгээр нөхцөл нь Монгол улсын хуулиар хэрэгжинэ. Гаргах аливаа маргаан нь Улаанбаатар хотын шүүхийн дангаар шийдвэрлэгдэх болно.`
  },
  en: {
    terms_title: "Terms of Service",
    terms_close_button: "Close",
    terms_section_1: `1. Acceptance of Terms
By accessing, installing, or using the Cn viptravel platform and application (cnviptravel.com), you agree to be bound by these Terms of Service and all applicable laws and regulations.`,
    terms_section_2: `2. Description of Services
Cn viptravel is a comprehensive full-stack travel platform. Our services include, but are not limited to:
Guide & Tour Discovery: Facilitating the search, comparison, and booking of local and international tour guides and travel itineraries.
Integrated Booking & Payments: Enabling seamless booking for guides and third-party corporate services (camps, resorts, transport, restaurants) with payments via integrated gateways (QPay, SocialPay, credit cards).
AI-Powered Communication: Providing 10-language translation services to facilitate communication between travelers and guides.
Real-time Communication: Offering secure, real-time messaging, audio, and video calling services powered by Cloudflare Calls.
Live Streaming: Allowing guides to live-stream from destinations.
Interactive Mapping: Providing location-based services via technology like Mapbox.
Verification Services: Managing background checks and verification for guide profiles.`,
    terms_section_3: `3. Third-Party Services
Certain features of our platform utilize third-party APIs and services, including Google AI (Gemini API), Cloudflare, and Mapbox. By using these features, you acknowledge that your data may be processed according to their respective privacy policies and terms of service.`,
    terms_section_4: `4. Payments and Cancellations
All financial transactions are governed by our specific billing and refund policies. While we facilitate payments, we are not responsible for the ultimate delivery of services by third-party guides or corporate partners (camps, transport, etc.). Cancellation policies are determined by individual service providers.`,
    terms_section_5: `5. Limitation of Liability
Cn viptravel acts solely as an intermediary and technology provider. We are not responsible for the accuracy of AI translations, the quality of live streams, or any direct, indirect, incidental, special, or consequential damages resulting from the use of our platform or third-party services.`,
    terms_section_6: `6. Governing Law
These terms are governed by the laws of Mongolia. Any disputes arising shall be subject to the exclusive jurisdiction of the courts in Ulaanbaatar.`
  },
  cn: {
    terms_title: "服务条款",
    terms_close_button: "关闭",
    terms_section_1: `1. 接受条款
通过访问、安装或使用Cn viptravel平台和应用程序（cnviptravel.com），您同意受这些服务条款以及所有适用法律和法规的约束。`,
    terms_section_2: `2. 服务描述
Cn viptravel是一个全面的全栈旅行平台。我们的服务包括但不限于：
导游与旅行发现：促进搜索、比较和预订本地和国际导游及旅行行程。
集成预订与支付：通过集成支付网关（QPay、SocialPay、信用卡）为导游和第三方企业服务（营地、度假村、交通、餐厅）实现无缝预订。
AI驱动的通信：提供10种语言的翻译服务，以促进旅行者和导游之间的沟通。
实时通信：提供由Cloudflare Calls支持的安全、实时消息、音频和视频通话服务。
直播：允许导游从目的地进行直播。
交互式地图：通过Mapbox等技术提供基于位置的服务。
验证服务：管理导游资料的背景调查和验证。`,
    terms_section_3: `3. 第三方服务
我们平台的某些功能使用第三方API和服务，包括Google AI（Gemini API）、Cloudflare和Mapbox。使用这些功能即表示您承认您的数据可能会根据其各自的隐私政策和服务条款进行处理。`,
    terms_section_4: `4. 付款和取消
所有金融交易均受我们特定的计费和退款政策约束。虽然我们促进付款，但我们不对第三方导游或企业合作伙伴（营地、交通等）的最终服务交付负责。取消政策由各个服务提供商确定。`,
    terms_section_5: `5. 责任限制
Cn viptravel仅作为中介和技术提供商。我们对AI翻译的准确性、直播质量或使用我们平台或第三方服务导致的任何直接、间接、附带、特殊或后果性损害不承担责任。`,
    terms_section_6: `6. 管辖法律
这些条款受蒙古法律管辖。产生的任何争议应受乌兰巴托法院的专属管辖。`
  },
  ru: {
    terms_title: "Условия обслуживания",
    terms_close_button: "Закрыть",
    terms_section_1: `1. Принятие условий
Получая доступ, устанавливая или используя платформу и приложение Cn viptravel (cnviptravel.com), вы соглашаетесь соблюдать настоящие Условия обслуживания и все применимые законы и нормативные акты.`,
    terms_section_2: `2. Описание услуг
Cn viptravel — это комплексная полнофункциональная туристическая платформа. Наши услуги включают, но не ограничиваются:
Поиск гидов и туров: Облегчение поиска, сравнения и бронирования местных и международных гидов и маршрутов путешествий.
Интегрированное бронирование и оплата: Обеспечение беспрепятственного бронирования гидов и услуг сторонних корпоративных партнеров (кемпинги, курорты, транспорт, рестораны) с оплатой через интегрированные шлюзы (QPay, SocialPay, кредитные карты).
Общение на основе ИИ: Предоставление услуг перевода на 10 языков для облегчения общения между путешественниками и гидами.
Общение в реальном времени: Предоставление безопасных услуг обмена сообщениями, аудио- и видеозвонков в реальном времени на базе Cloudflare Calls.
Прямая трансляция: Возможность для гидов вести прямые трансляции с мест назначения.
Интерактивные карты: Предоставление услуг на основе местоположения с использованием таких технологий, как Mapbox.
Услуги проверки: Управление проверкой биографических данных и верификацией профилей гидов.`,
    terms_section_3: `3. Услуги третьих сторон
Некоторые функции нашей платформы используют API и услуги третьих сторон, включая Google AI (Gemini API), Cloudflare и Mapbox. Используя эти функции, вы признаете, что ваши данные могут обрабатываться в соответствии с их политиками конфиденциальности и условиями обслуживания.`,
    terms_section_4: `4. Платежи и отмены
Все финансовые операции регулируются нашими конкретными политиками выставления счетов и возврата средств. Хотя мы облегчаем платежи, мы не несем ответственности за окончательную доставку услуг сторонними гидами или корпоративными партнерами (кемпинги, транспорт и т.д.). Политики отмены определяются отдельными поставщиками услуг.`,
    terms_section_5: `5. Ограничение ответственности
Cn viptravel действует исключительно как посредник и поставщик технологий. Мы не несем ответственности за точность переводов ИИ, качество прямых трансляций или любые прямые, косвенные, случайные, специальные или косвенные убытки, возникшие в результате использования нашей платформы или услуг третьих сторон.`,
    terms_section_6: `6. Применимое право
Настоящие условия регулируются законодательством Монголии. Любые возникающие споры подлежат исключительной юрисдикции судов в Улан-Баторе.`
  },
  ja: {
    terms_title: "利用規約",
    terms_close_button: "閉じる",
    terms_section_1: `1. 規約の承諾
Cn viptravelプラットフォームおよびアプリケーション（cnviptravel.com）にアクセス、インストール、または使用することにより、お客様は本利用規約およびすべての適用される法律および規制に拘束されることに同意するものとします。`,
    terms_section_2: `2. サービスの説明
Cn viptravelは、包括的なフルスタック旅行プラットフォームです。当社のサービスには以下が含まれますが、これらに限定されません：
ガイドとツアーの発見：地元および国際的な旅行ガイドや旅行行程の検索、比較、予約を促進します。
統合予約と支払い：統合ゲートウェイ（QPay、SocialPay、クレジットカード）を介した支払いで、ガイドおよびサードパーティ企業サービス（キャンプ場、リゾート、交通、レストラン）のシームレスな予約を可能にします。
AIを活用したコミュニケーション：旅行者とガイド間のコミュニケーションを促進するための10言語翻訳サービスを提供します。
リアルタイムコミュニケーション：Cloudflare Callsを活用した安全なリアルタイムメッセージング、オーディオ、ビデオ通話サービスを提供します。
ライブストリーミング：ガイドが目的地からライブ配信できるようにします。
インタラクティブマッピング：Mapboxなどの技術を利用した位置情報ベースのサービスを提供します。
検証サービス：ガイドプロファイルのバックグラウンドチェックと検証を管理します。`,
    terms_section_3: `3. サードパーティサービス
当社プラットフォームの特定の機能は、Google AI（Gemini API）、Cloudflare、MapboxなどのサードパーティAPIおよびサービスを利用しています。これらの機能を使用することにより、お客様は自身のデータがそれぞれのプライバシーポリシーおよび利用規約に従って処理される可能性があることを了承するものとします。`,
    terms_section_4: `4. 支払いとキャンセル
すべての金融取引は、当社の特定の請求および返金ポリシーに準拠します。当社は支払いを促進しますが、サードパーティガイドまたは企業パートナー（キャンプ場、交通など）によるサービスの最終的な提供については責任を負いません。キャンセルポリシーは個々のサービスプロバイダーによって決定されます。`,
    terms_section_5: `5. 責任の制限
Cn viptravelは、単なる仲介者および技術プロバイダーとして機能します。当社は、AI翻訳の正確性、ライブストリームの品質、または当社プラットフォームまたはサードパーティサービスの使用に起因する直接的、間接的、偶発的、特別、または結果的損害について責任を負いません。`,
    terms_section_6: `6. 準拠法
本規約は、モンゴルの法律に準拠します。発生するいかなる紛争も、ウランバートルの裁判所の専属管轄に服するものとします。`
  },
  ko: {
    terms_title: "서비스 약관",
    terms_close_button: "닫기",
    terms_section_1: `1. 약관 수락
Cn viptravel 플랫폼 및 애플리케이션(cnviptravel.com)에 접속, 설치 또는 사용함으로써 귀하는 본 서비스 약관 및 모든 적용 가능한 법률 및 규정에 구속되는 데 동의합니다.`,
    terms_section_2: `2. 서비스 설명
Cn viptravel은 포괄적인 풀스택 여행 플랫폼입니다. 당사의 서비스에는 다음이 포함되지만 이에 국한되지 않습니다:
가이드 및 투어 발견: 지역 및 국제 여행 가이드 및 여행 일정의 검색, 비교 및 예약을 용이하게 합니다.
통합 예약 및 결제: 통합 게이트웨이(QPay, SocialPay, 신용 카드)를 통한 결제로 가이드 및 제3자 기업 서비스(캠프장, 리조트, 교통, 레스토랑)의 원활한 예약을 가능하게 합니다.
AI 기반 커뮤니케이션: 여행자와 가이드 간의 커뮤니케이션을 용이하게 하는 10개 언어 번역 서비스를 제공합니다.
실시간 커뮤니케이션: Cloudflare Calls를 기반으로 한 안전한 실시간 메시징, 오디오 및 영상 통화 서비스를 제공합니다.
라이브 스트리밍: 가이드가 목적지에서 라이브 스트리밍할 수 있도록 합니다.
인터랙티브 매핑: Mapbox와 같은 기술을 통한 위치 기반 서비스를 제공합니다.
검증 서비스: 가이드 프로필의 배경 조사 및 검증을 관리합니다.`,
    terms_section_3: `3. 제3자 서비스
당사 플랫폼의 특정 기능은 Google AI(Gemini API), Cloudflare, Mapbox를 포함한 제3자 API 및 서비스를 활용합니다. 이러한 기능을 사용함으로써 귀하는 귀하의 데이터가 각각의 개인정보 보호정책 및 서비스 약관에 따라 처리될 수 있음을 인정합니다.`,
    terms_section_4: `4. 결제 및 취소
모든 금융 거래는 당사의 특정 청구 및 환불 정책에 따라 관리됩니다. 당사는 결제를 용이하게 하지만 제3자 가이드 또는 기업 파트너(캠프장, 교통 등)의 최종 서비스 제공에 대해서는 책임을 지지 않습니다. 취소 정책은 개별 서비스 제공업체에 의해 결정됩니다.`,
    terms_section_5: `5. 책임 제한
Cn viptravel은 단순히 중개자 및 기술 제공자 역할을 합니다. 당사는 AI 번역의 정확성, 라이브 스트림의 품질 또는 당사 플랫폼 또는 제3자 서비스 사용으로 인한 직접적, 간접적, 부수적, 특별 또는 결과적 손해에 대해 책임을 지지 않습니다.`,
    terms_section_6: `6. 준거법
본 약관은 몽골 법률에 따라 규율됩니다. 발생하는 모든 분쟁은 울란바토르 법원의 전속 관할에 따릅니다.`
  },
  de: {
    terms_title: "Nutzungsbedingungen",
    terms_close_button: "Schließen",
    terms_section_1: `1. Annahme der Bedingungen
Durch den Zugriff auf, die Installation oder die Nutzung der Cn viptravel-Plattform und -Anwendung (cnviptravel.com) erklären Sie sich damit einverstanden, an diese Nutzungsbedingungen und alle anwendbaren Gesetze und Vorschriften gebunden zu sein.`,
    terms_section_2: `2. Beschreibung der Dienstleistungen
Cn viptravel ist eine umfassende Full-Stack-Reiseplattform. Unsere Dienstleistungen umfassen, sind aber nicht beschränkt auf:
Reiseführer- & Tour-Entdeckung: Erleichterung der Suche, des Vergleichs und der Buchung von lokalen und internationalen Reiseführern und Reiserouten.
Integrierte Buchung & Zahlungen: Ermöglicht nahtlose Buchungen für Reiseführer und Dienstleistungen von Drittanbietern (Camps, Resorts, Transport, Restaurants) mit Zahlungen über integrierte Gateways (QPay, SocialPay, Kreditkarten).
KI-gestützte Kommunikation: Bereitstellung von Übersetzungsdiensten in 10 Sprachen zur Erleichterung der Kommunikation zwischen Reisenden und Reiseführern.
Echtzeit-Kommunikation: Bietet sichere Echtzeit-Nachrichten-, Audio- und Videoanrufdienste, die von Cloudflare Calls unterstützt werden.
Live-Streaming: Ermöglicht es Reiseführern, Live-Streams von Zielorten zu senden.
Interaktive Kartierung: Bereitstellung standortbasierter Dienste über Technologien wie Mapbox.
Verifizierungsdienste: Verwaltung von Hintergrundüberprüfungen und Verifizierung von Reiseführerprofilen.`,
    terms_section_3: `3. Drittanbieter-Dienstleistungen
Bestimmte Funktionen unserer Plattform nutzen APIs und Dienstleistungen von Drittanbietern, einschließlich Google AI (Gemini API), Cloudflare und Mapbox. Durch die Nutzung dieser Funktionen erkennen Sie an, dass Ihre Daten gemäß deren jeweiligen Datenschutzrichtlinien und Nutzungsbedingungen verarbeitet werden können.`,
    terms_section_4: `4. Zahlungen und Stornierungen
Alle finanziellen Transaktionen unterliegen unseren spezifischen Abrechnungs- und Rückerstattungsrichtlinien. Während wir Zahlungen erleichtern, sind wir nicht verantwortlich für die endgültige Erbringung von Dienstleistungen durch Drittanbieter-Reiseführer oder Unternehmenspartner (Camps, Transport usw.). Stornierungsrichtlinien werden von einzelnen Dienstleistern festgelegt.`,
    terms_section_5: `5. Haftungsbeschränkung
Cn viptravel handelt ausschließlich als Vermittler und Technologieanbieter. Wir sind nicht verantwortlich für die Genauigkeit von KI-Übersetzungen, die Qualität von Live-Streams oder direkte, indirekte, zufällige, besondere oder Folgeschäden, die sich aus der Nutzung unserer Plattform oder von Drittanbieter-Dienstleistungen ergeben.`,
    terms_section_6: `6. Anwendbares Recht
Diese Bedingungen unterliegen den Gesetzen der Mongolei. Alle sich ergebenden Streitigkeiten unterliegen der ausschließlichen Zuständigkeit der Gerichte in Ulaanbaatar.`
  },
  fr: {
    terms_title: "Conditions d'utilisation",
    terms_close_button: "Fermer",
    terms_section_1: `1. Acceptation des conditions
En accédant, en installant ou en utilisant la plateforme et l'application Cn viptravel (cnviptravel.com), vous acceptez d'être lié par ces Conditions d'utilisation et toutes les lois et réglementations applicables.`,
    terms_section_2: `2. Description des services
Cn viptravel est une plateforme de voyage complète full-stack. Nos services comprennent, sans s'y limiter :
Découverte de guides et de circuits : Facilitation de la recherche, de la comparaison et de la réservation de guides touristiques locaux et internationaux et d'itinéraires de voyage.
Réservation et paiements intégrés : Permet une réservation transparente pour les guides et les services d'entreprises tierces (camps, resorts, transport, restaurants) avec des paiements via des passerelles intégrées (QPay, SocialPay, cartes de crédit).
Communication alimentée par l'IA : Fourniture de services de traduction en 10 langues pour faciliter la communication entre les voyageurs et les guides.
Communication en temps réel : Offre des services de messagerie, d'appels audio et vidéo sécurisés en temps réel, alimentés par Cloudflare Calls.
Diffusion en direct : Permet aux guides de diffuser en direct depuis les destinations.
Cartographie interactive : Fourniture de services basés sur la localisation via des technologies comme Mapbox.
Services de vérification : Gestion des vérifications des antécédents et de la vérification des profils de guides.`,
    terms_section_3: `3. Services tiers
Certaines fonctionnalités de notre plateforme utilisent des API et des services tiers, notamment Google AI (Gemini API), Cloudflare et Mapbox. En utilisant ces fonctionnalités, vous reconnaissez que vos données peuvent être traitées conformément à leurs politiques de confidentialité et conditions d'utilisation respectives.`,
    terms_section_4: `4. Paiements et annulations
Toutes les transactions financières sont régies par nos politiques spécifiques de facturation et de remboursement. Bien que nous facilitions les paiements, nous ne sommes pas responsables de la prestation finale des services par les guides tiers ou les partenaires d'entreprise (camps, transport, etc.). Les politiques d'annulation sont déterminées par les prestataires de services individuels.`,
    terms_section_5: `5. Limitation de responsabilité
Cn viptravel agit uniquement en tant qu'intermédiaire et fournisseur de technologie. Nous ne sommes pas responsables de l'exactitude des traductions IA, de la qualité des diffusions en direct, ou de tout dommage direct, indirect, accessoire, spécial ou consécutif résultant de l'utilisation de notre plateforme ou des services tiers.`,
    terms_section_6: `6. Droit applicable
Ces conditions sont régies par les lois de la Mongolie. Tout litige survenant relève de la compétence exclusive des tribunaux d'Oulan-Bator.`
  },
  es: {
    terms_title: "Términos de Servicio",
    terms_close_button: "Cerrar",
    terms_section_1: `1. Aceptación de los Términos
Al acceder, instalar o utilizar la plataforma y aplicación Cn viptravel (cnviptravel.com), usted acepta estar sujeto a estos Términos de Servicio y todas las leyes y regulaciones aplicables.`,
    terms_section_2: `2. Descripción de los Servicios
Cn viptravel es una plataforma de viajes integral de pila completa. Nuestros servicios incluyen, pero no se limitan a:
Descubrimiento de Guías y Tours: Facilitar la búsqueda, comparación y reserva de guías turísticos locales e internacionales e itinerarios de viaje.
Reserva y Pagos Integrados: Permitir reservas sin problemas para guías y servicios corporativos de terceros (campamentos, resorts, transporte, restaurantes) con pagos a través de pasarelas integradas (QPay, SocialPay, tarjetas de crédito).
Comunicación con IA: Proporcionar servicios de traducción en 10 idiomas para facilitar la comunicación entre viajeros y guías.
Comunicación en Tiempo Real: Ofrecer servicios seguros de mensajería, llamadas de audio y video en tiempo real, impulsados por Cloudflare Calls.
Transmisión en Vivo: Permitir que los guías transmitan en vivo desde destinos.
Mapeo Interactivo: Proporcionar servicios basados en ubicación a través de tecnología como Mapbox.
Servicios de Verificación: Gestionar verificaciones de antecedentes y verificación de perfiles de guías.`,
    terms_section_3: `3. Servicios de Terceros
Ciertas funciones de nuestra plataforma utilizan API y servicios de terceros, incluidos Google AI (Gemini API), Cloudflare y Mapbox. Al usar estas funciones, usted reconoce que sus datos pueden procesarse de acuerdo con sus respectivas políticas de privacidad y términos de servicio.`,
    terms_section_4: `4. Pagos y Cancelaciones
Todas las transacciones financieras se rigen por nuestras políticas específicas de facturación y reembolso. Si bien facilitamos los pagos, no somos responsables de la entrega final de servicios por parte de guías de terceros o socios corporativos (campamentos, transporte, etc.). Las políticas de cancelación son determinadas por proveedores de servicios individuales.`,
    terms_section_5: `5. Limitación de Responsabilidad
Cn viptravel actúa únicamente como intermediario y proveedor de tecnología. No somos responsables de la precisión de las traducciones de IA, la calidad de las transmisiones en vivo, o cualquier daño directo, indirecto, incidental, especial o consecuente resultante del uso de nuestra plataforma o servicios de terceros.`,
    terms_section_6: `6. Ley Aplicable
Estos términos se rigen por las leyes de Mongolia. Cualquier disputa que surja estará sujeta a la jurisdicción exclusiva de los tribunales en Ulaanbaatar.`
  },
  it: {
    terms_title: "Termini di Servizio",
    terms_close_button: "Chiudi",
    terms_section_1: `1. Accettazione dei Termini
Accedendo, installando o utilizzando la piattaforma e l'applicazione Cn viptravel (cnviptravel.com), accetti di essere vincolato da questi Termini di Servizio e da tutte le leggi e regolamenti applicabili.`,
    terms_section_2: `2. Descrizione dei Servizi
Cn viptravel è una piattaforma di viaggio completa full-stack. I nostri servizi includono, ma non sono limitati a:
Scoperta Guide e Tour: Facilitare la ricerca, il confronto e la prenotazione di guide turistiche locali e internazionali e itinerari di viaggio.
Prenotazione e Pagamenti Integrati: Consentire prenotazioni senza soluzione di continuità per guide e servizi aziendali di terze parti (campeggi, resort, trasporti, ristoranti) con pagamenti tramite gateway integrati (QPay, SocialPay, carte di credito).
Comunicazione basata su IA: Fornire servizi di traduzione in 10 lingue per facilitare la comunicazione tra viaggiatori e guide.
Comunicazione in Tempo Reale: Offrire servizi sicuri di messaggistica, chiamate audio e video in tempo reale, alimentati da Cloudflare Calls.
Streaming Live: Consentire alle guide di trasmettere in diretta dalle destinazioni.
Mappatura Interattiva: Fornire servizi basati sulla posizione tramite tecnologie come Mapbox.
Servizi di Verifica: Gestire controlli dei precedenti e verifica dei profili delle guide.`,
    terms_section_3: `3. Servizi di Terze Parti
Alcune funzionalità della nostra piattaforma utilizzano API e servizi di terze parti, inclusi Google AI (Gemini API), Cloudflare e Mapbox. Utilizzando queste funzionalità, riconosci che i tuoi dati possono essere elaborati secondo le rispettive politiche sulla privacy e termini di servizio.`,
    terms_section_4: `4. Pagamenti e Cancellazioni
Tutte le transazioni finanziarie sono regolate dalle nostre specifiche politiche di fatturazione e rimborso. Sebbene facilitiamo i pagamenti, non siamo responsabili della consegna finale dei servizi da parte di guide di terze parti o partner aziendali (campeggi, trasporti, ecc.). Le politiche di cancellazione sono determinate dai singoli fornitori di servizi.`,
    terms_section_5: `5. Limitazione di Responsabilità
Cn viptravel agisce esclusivamente come intermediario e fornitore di tecnologia. Non siamo responsabili per l'accuratezza delle traduzioni IA, la qualità degli stream live o qualsiasi danno diretto, indiretto, incidentale, speciale o consequenziale derivante dall'uso della nostra piattaforma o dei servizi di terze parti.`,
    terms_section_6: `6. Legge Applicabile
Questi termini sono regolati dalle leggi della Mongolia. Eventuali controversie che sorgono saranno soggette alla giurisdizione esclusiva dei tribunali di Ulaanbaatar.`
  }
};

// Create the context
const LanguageTermsContext = createContext<LanguageTermsContextType | undefined>(undefined);

// Provider component
export const LanguageTermsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  
  const t = (key: string): string => {
    const translations = termsTranslations[language];
    if (!translations) {
      console.warn(`No translations found for language: ${language}`);
      return key;
    }
    
    const translation = translations[key];
    if (!translation) {
      console.warn(`No translation found for key: ${key} in language: ${language}`);
      return key;
    }
    
    return translation;
  };

  const value = {
    t
  };

  return (
    <LanguageTermsContext.Provider value={value}>
      {children}
    </LanguageTermsContext.Provider>
  );
};

// Custom hook to use the context
export const useLanguageTerms = (): LanguageTermsContextType => {
  const context = useContext(LanguageTermsContext);
  if (context === undefined) {
    throw new Error('useLanguageTerms must be used within a LanguageTermsProvider');
  }
  return context;
};
