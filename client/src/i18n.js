import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  ar: {
    translation: {
      welcome: 'مرحباً بك في محطتي',
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      name: 'الاسم',
      phone: 'الهاتف',
      company_name: 'اسم الشركة',
      role: 'نوع الحساب',
      advertiser: 'معلن (صاحب محطة وقود)',
      subscriber: 'مشترك (شركة)',
      submit: 'إرسال',
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      search: 'بحث',
      filter: 'تصفية',
      ads: 'الإعلانات',
      ad: 'إعلان',
      create_ad: 'إنشاء إعلان',
      title: 'العنوان',
      description: 'الوصف',
      location: 'الموقع',
      facilities: 'المرافق',
      fuel_types: 'أنواع الوقود',
      images: 'الصور',
      map: 'الخريطة',
      dashboard: 'لوحة التحكم',
      profile: 'الملف الشخصي',
      messages: 'الرسائل',
      notifications: 'الإشعارات',
      settings: 'الإعدادات',
      logout: 'تسجيل الخروج',
      subscription: 'الاشتراك',
      payments: 'المدفوعات',
      blog: 'المدونة',
      admin: 'الإدارة',
      reports: 'التقارير',
      users: 'المستخدمون',
      logs: 'السجلات'
    }
  },
  en: {
    translation: {
      welcome: 'Welcome to Mahattati',
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      name: 'Name',
      phone: 'Phone',
      company_name: 'Company Name',
      role: 'Account Type',
      advertiser: 'Advertiser (Fuel Station Owner)',
      subscriber: 'Subscriber (Company)',
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      filter: 'Filter',
      ads: 'Ads',
      ad: 'Ad',
      create_ad: 'Create Ad',
      title: 'Title',
      description: 'Description',
      location: 'Location',
      facilities: 'Facilities',
      fuel_types: 'Fuel Types',
      images: 'Images',
      map: 'Map',
      dashboard: 'Dashboard',
      profile: 'Profile',
      messages: 'Messages',
      notifications: 'Notifications',
      settings: 'Settings',
      logout: 'Logout',
      subscription: 'Subscription',
      payments: 'Payments',
      blog: 'Blog',
      admin: 'Admin',
      reports: 'Reports',
      users: 'Users',
      logs: 'Logs'
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    lng: localStorage.getItem('i18nextLng') || 'ar',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;



