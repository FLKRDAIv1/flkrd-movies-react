/**
 * Firebase Auth error mapper for Kurdish (Sorani & Badini) and English.
 * Translates low-level Firebase error codes into user-friendly notifications.
 */

export interface AuthErrorTranslation {
  title: string;
  message: string;
}

export const getAuthErrorMessage = (
  error: any,
  language: string = 'ku'
): AuthErrorTranslation => {
  const isKurdish = language === 'ku' || language === 'badini';
  const code: string = error?.code || '';
  const rawMsg: string = error?.message || '';

  switch (code) {
    case 'auth/invalid-email':
      return {
        title: isKurdish ? 'ئیمەیڵی نادروست' : 'Invalid Email',
        message: isKurdish
          ? 'تکایە ناونیشانی ئیمەیڵێکی دروست و تەواو بنووسە.'
          : 'Please enter a valid email address.'
      };

    case 'auth/user-disabled':
      return {
        title: isKurdish ? 'هەژمار ڕاگیراوە' : 'Account Disabled',
        message: isKurdish
          ? 'ئەم هەژمارە ناچالاک کراوە. تکایە پەیوەندی بە سەرپەرشتیارەوە بکە.'
          : 'This user account has been disabled. Please contact support.'
      };

    case 'auth/user-not-found':
      return {
        title: isKurdish ? 'هەژمار نەدۆزرایەوە' : 'User Not Found',
        message: isKurdish
          ? 'هیچ هەژمارێک بەم ئیمەیڵە تۆمار نەکراوە. تکایە سەرەتا ئەکاونت دروست بکە.'
          : 'No account found with this email. Please sign up first.'
      };

    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return {
        title: isKurdish ? 'زانیاری هەڵەیە' : 'Invalid Credentials',
        message: isKurdish
          ? 'ئیمەیڵ یان تێپەڕەوشە (پاسوۆرد) هەڵەیە. تکایە دووبارە پشکنینی بۆ بکە.'
          : 'Incorrect email or password. Please verify and try again.'
      };

    case 'auth/email-already-in-use':
      return {
        title: isKurdish ? 'ئیمەیڵ پێشتر بەکارهاتووە' : 'Email Already In Use',
        message: isKurdish
          ? 'ئەم ئیمەیڵە پێشتر تۆمارکراوە. دەتوانیت ڕاستەوخۆ بچیتە ژوورەوە.'
          : 'An account already exists with this email. Please log in.'
      };

    case 'auth/weak-password':
      return {
        title: isKurdish ? 'پاسوۆردی لاواز' : 'Weak Password',
        message: isKurdish
          ? 'پاسوۆردەکە لاوازە. پێویستە لانیکەم ٦ پیت یان ژمارە بێت.'
          : 'The password is too weak. Please use at least 6 characters.'
      };

    case 'auth/operation-not-allowed':
      return {
        title: isKurdish ? 'خزمەتگوزاری بەردەست نییە' : 'Provider Disabled',
        message: isKurdish
          ? 'ئەم ڕێگەیەی چوونەژوورەوە لە ئێستادا لە پرۆژەکە چالاک نەکراوە.'
          : 'This sign-in method is currently not enabled in Firebase Console.'
      };

    case 'auth/popup-blocked':
      return {
        title: isKurdish ? 'پەنجەرە ڕاگیرا' : 'Popup Blocked',
        message: isKurdish
          ? 'پەنجەرەی گووگڵ لەلایەن وێبگەڕەکەتەوە بلۆک کرا. پەڕەکە ڕەوانەی فەرمی دەکرێت.'
          : 'Popup was blocked by your browser. Redirecting to sign in...'
      };

    case 'auth/expired-action-code':
      return {
        title: isKurdish ? 'بەستەر بەسەرچووە' : 'Link Expired',
        message: isKurdish
          ? 'بەستەری نوێکردنەوەی پاسوۆرد بەسەرچووە. تکایە دووبارە داوای بەستەرێکی نوێ بکەرەوە.'
          : 'This password reset link has expired. Please request a new one.'
      };

    case 'auth/invalid-action-code':
      return {
        title: isKurdish ? 'بەستەری نادروست' : 'Invalid Link',
        message: isKurdish
          ? 'بەستەری نوێکردنەوەکە نادروستە یان پێشتر بەکارهاتووە.'
          : 'This reset link is invalid or has already been used.'
      };

    case 'auth/too-many-requests':
      return {
        title: isKurdish ? 'هەوڵی زۆر' : 'Too Many Attempts',
        message: isKurdish
          ? 'هەوڵی زۆر لەسەریەک دراوە. تکایە کەمێکی تر هەوڵ بدەرەوە.'
          : 'Too many unsuccessful attempts. Please try again later.'
      };

    case 'auth/network-request-failed':
      return {
        title: isKurdish ? 'هەڵەی هێڵ' : 'Network Error',
        message: isKurdish
          ? 'تکایە دڵنیابەرەوە لە پەیوەندی هێڵی ئینتەرنێتەکەت.'
          : 'Network error. Please check your internet connection.'
      };

    default:
      return {
        title: isKurdish ? 'هەڵەی چوونەژوورەوە' : 'Authentication Error',
        message: rawMsg || (isKurdish ? 'هەڵەیەک ڕوویدا، تکایە دووبارە هەوڵ بدەرەوە.' : 'An error occurred. Please try again.')
      };
  }
};
