// ==========================================
// PHẦN 1: BIẾN TOÀN CỤC & TIỆN ÍCH CƠ BẢN
// ==========================================
window.db = null; window.session = null; window.serverOffset = 0; window.isDemoMode = false; window.currentChatRef = null; window.currentPrivateConvo = ""; window.currentStreakRef = null; window.isSpying = false; window.currentGroupChat = ""; window.currentGroupAdmin = ""; window.html5QrcodeScanner = null; window.currentUploadType = null; window.typingTimeout = null; window.IMGBB_API_KEY = "Cdb452c548546016f5ad7d5954d6d280"; window.currentVillage = 'hs';


// =========================================================
// PHÂN LUỒNG VAI TRÒ: hs (học sinh) | gv (giáo viên) | ql (quản lý) | admin (Boss, ẩn)
//  - admin  : toàn quyền, KHÔNG hiển thị với bất kỳ ai khác
//  - ql     : như admin nhưng KHÔNG được xoá dữ liệu hệ thống / xoá tài khoản
//  - gv     : chấm điểm, điểm danh, đóng tiền, quản lý học sinh
//  - hs     : xem thông tin cá nhân
// =========================================================
window.ROLE_LABELS = { hs: 'HỌC SINH', cuu_hs: 'CỰU HỌC SINH', gv: 'GIÁO VIÊN', ql: 'QUẢN LÝ', admin: 'QUẢN LÝ' };
window.isBoss = () => !!(window.session && window.session.role === 'admin');
window.isAdminLevel = () => !!(window.session && (window.session.role === 'admin' || window.session.role === 'ql')) || window.isDemoMode === true;
window.isStaff = () => window.isAdminLevel() || !!(window.session && window.session.role === 'gv');
window.roleLabel = (r) => window.ROLE_LABELS[r] || String(r || '').toUpperCase();

window.applyBranding = (name, logo) => { 
    document.querySelectorAll('.dynamic-app-name').forEach(el => el.innerText = name || "KIM MIN LAI"); 
    const logoEl = document.getElementById('main-login-logo'); 
    if (logoEl) { 
        if (logo) { logoEl.src = logo; logoEl.classList.remove('hidden'); } 
        else { logoEl.classList.add('hidden'); } 
    } 
    // CACHE: Lưu vào localStorage để lần sau hiện ra ngay lập tức không cần chờ Firebase
    try {
        if (name) localStorage.setItem('cachedBrandName', name);
        if (logo) localStorage.setItem('cachedBrandLogo', logo);
    } catch(e) {}
};
// KHÔI PHỤC branding từ cache ngay khi script chạy — logo & tên hiện trước cả khi Firebase trả về
(() => {
    try {
        const cachedName = localStorage.getItem('cachedBrandName');
        const cachedLogo = localStorage.getItem('cachedBrandLogo');
        if (cachedName || cachedLogo) {
            const apply = () => window.applyBranding(cachedName, cachedLogo);
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
            else apply();
        }
    } catch(e) {}
})();
window.allUsersMap = {}; // Khởi tạo mảng trống tránh lỗi Undefined ban đầu
window.myNicknames = {}; // Khởi tạo trống tránh lỗi Undefined khi chưa tải xong biệt danh
// =========================================================
// BẢN VÁ LỖI AN TOÀN TRUY XUẤT THÀNH VIÊN (CHỐNG SẬP APP)
// =========================================================
window.getSafeUserInfo = (uid) => {
    if (!uid) {
        return { name: "ẨN DANH", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png", role: "học viên" };
    }
    
    // Nếu dữ liệu đã tải xong từ Firebase và khớp uid
    if (window.allUsersMap && window.allUsersMap[uid]) {
        return window.allUsersMap[uid];
    }
    
    // Nếu mạng chậm dữ liệu chưa về kịp, trả về dữ liệu tạm để app không bị sập lỗi code
    return {
        name: String(uid).toUpperCase() + " (Đang tải...⏳)",
        avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
        role: "học viên"
    };
};

window.now = () => new Date().getTime() + window.serverOffset;

window.getDateStr = (off = 0) => { 
    const d = new Date(window.now()); 
    d.setDate(d.getDate() + off); 
    const p = n => n < 10 ? '0' + n : n; 
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); 
};

window.toggleDarkMode = (chk) => { 
    const isDark = chk.checked; 
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light'); 
    localStorage.setItem('darkMode', isDark); 
};

// SỬA LỖI: Khôi phục chế độ tối đã lưu khi mở lại web (trước đây lưu mà không bao giờ đọc lại)
(() => {
    const savedDark = localStorage.getItem('darkMode') === 'true';
    if (savedDark) document.documentElement.setAttribute('data-theme', 'dark');
    document.addEventListener('DOMContentLoaded', () => {
        const t = document.getElementById('dark-mode-toggle');
        if (t) t.checked = savedDark;
    });
})();
window.escapeHTML = (str) => { 
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(match) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
    });
};


const showNetworkToast = (msg, bg) => { 
    const t = document.getElementById('network-toast'); 
    if(t) { 
        t.innerText = msg; t.style.background = bg; t.classList.remove('hidden'); 
        setTimeout(() => t.classList.add('hidden'), 4000); 
    } 
};

window.addEventListener('offline', () => showNetworkToast('⚠️ Mất kết nối mạng!', '#dc3545')); 
window.addEventListener('online', () => showNetworkToast('✅ Có mạng trở lại!', '#4CAF50'));

const setOfflineStatus = () => { 
    if (window.session && window.db) { 
        window.db.ref('tracking/' + window.session.id).update({ status: 'offline', lastLogout: firebase.database.ServerValue.TIMESTAMP }); 
    } 
};

window.showToast = (msg, isSuccess = true) => {
    // Tự động tạo thẻ nếu chưa có để không phải sửa HTML
    let toast = document.getElementById('smart-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'smart-toast';
        toast.style.cssText = 'position:fixed; bottom:-100px; left:50%; transform:translateX(-50%); padding:12px 25px; border-radius:25px; color:white; font-weight:bold; z-index:999999; transition:0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); box-shadow:0 5px 15px rgba(0,0,0,0.2); pointer-events:none;';
        document.body.appendChild(toast);
    }
    
    // Set màu theo tông của web (hồng/xanh)
    toast.style.background = isSuccess ? '#4CAF50' : 'var(--pink)';
    toast.innerText = msg;
    
    // Hiệu ứng trượt lên
    toast.style.bottom = '40px';
    
    // 3 giây sau tự trượt xuống giấu đi
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.style.bottom = '-100px';
    }, 3000);
};

// =========================================================
// BẢN VÁ LỖI CLIPBOARD CHẠY ĐƯỢC TRÊN CẢ HTTP VÀ HTTPS
// =========================================================
window.safeCopyText = (text, successMsg = "✅ Đã sao chép thành công!") => {
    // Cách 1: Thử dùng bộ nhớ đệm tiêu chuẩn (Yêu cầu HTTPS)
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => {
                if (typeof window.showToast === 'function') window.showToast(successMsg);
                else alert(successMsg);
            })
            .catch(() => {
                // Nếu lỗi thì kích hoạt cơ chế dự phòng luôn
                window.fallbackCopyText(text, successMsg);
            });
    } else {
        // Cách 2: Cơ chế dự phòng cho môi trường HTTP thông thường hoặc máy cũ
        window.fallbackCopyText(text, successMsg);
    }
};

window.fallbackCopyText = (text, successMsg) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Đẩy khung text ra khỏi màn hình để người dùng không nhìn thấy
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            if (typeof window.showToast === 'function') window.showToast(successMsg);
            else alert(successMsg);
        } else {
            // Trường hợp trình duyệt quá cũ chặn gắt gao thì hiện hộp thoại cho người dùng tự bôi đen copy
            window.prompt("Trình duyệt chặn tự động. Em hãy tự sao chép đoạn mã bên dưới nhé:", text);
        }
    } catch (err) {
        window.prompt("Trình duyệt chặn tự động. Em hãy tự sao chép đoạn mã bên dưới nhé:", text);
    }
    
    document.body.removeChild(textArea); // Dọn dẹp thẻ sau khi dùng xong
};

// Cập nhật lại hàm Copy Link cá nhân sử dụng bộ lõi an toàn mới
window.copyMyLink = () => { 
    if(!window.session || !window.session.id) return window.showCustomAlert("LỖI", "Không tìm thấy thông tin phiên đăng nhập!", "⚠️");
    const link = location.origin + location.pathname + '?user=' + window.session.id; 
    window.safeCopyText(link, "✅ Đã copy link cá nhân!");
};

window.addEventListener('beforeunload', setOfflineStatus);
document.addEventListener('visibilitychange', () => { 
    if (document.visibilityState === 'hidden') setOfflineStatus(); 
    else if (document.visibilityState === 'visible' && window.session && window.db) { 
        window.db.ref('tracking/' + window.session.id).update({ status: 'online', lastLogin: firebase.database.ServerValue.TIMESTAMP }); 
    } 
});
// ==========================================
// BẢN VÁ: THÔNG BÁO ĐẨY (PUSH NOTI)
// ==========================================
window.requestNoti = () => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") Notification.requestPermission();
};

window.pushNoti = (title, body) => {
    // SỬA LỖI: kiểm tra Notification tồn tại trước (iOS Safari không có sẽ gây crash)
    if (!("Notification" in window)) return;
    if (document.visibilityState === 'visible' || Notification.permission !== "granted") return;
    new Notification(title, {
        body: body,
        icon: (window.session && window.session.avatar) || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    });
};

// =========================================================
// SỬA LỖI: HÀM ĐỔI AVATAR CÁ NHÂN BỊ THIẾU HOÀN TOÀN
// HTML có <input id="user-file" onchange="uploadUserAvt()"> nhưng hàm không tồn tại
// và không có gì kích hoạt hộp chọn ảnh. Nay bấm vào avatar trên thanh header để đổi.
// =========================================================
window.uploadUserAvt = async () => {
    const fileInput = document.getElementById('user-file');
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!file || !window.session) return;

    window.showCustomAlert("⏳ ĐANG XỬ LÝ", "Đang tải ảnh đại diện mới lên hệ thống...", "🖼️");
    const url = await window.uploadToImgBB(file);
    if (fileInput) fileInput.value = '';

    if (url) {
        window.db.ref('users/' + window.session.id).update({ avatar: url }).then(() => {
            window.session.avatar = url;
            const headerAvt = document.getElementById('user-avatar');
            if (headerAvt) headerAvt.src = url;
            const tabAvt = document.getElementById('my-tab-avatar');
            if (tabAvt) tabAvt.src = url;
            window.showCustomAlert("THÀNH CÔNG", "Đã cập nhật ảnh đại diện mới!", "✅");
        }).catch(err => {
            window.showCustomAlert("LỖI", "Không thể lưu ảnh: " + err.message, "❌");
        });
    } else {
        window.showCustomAlert("LỖI", "Tải ảnh thất bại! Vui lòng thử lại.", "❌");
    }
};


// ==========================================
// PHẦN 2: KHỞI TẠO FIREBASE & AUTO-SETUP
// ==========================================

function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            if (window.splashStage) window.splashStage('firebase');

            const c = {
                apiKey: "AIzaSyAcfas2KJo9n4Lpb9YVhGOpKWfYgBlSE9U",
                authDomain: "app-co-eb5d0.firebaseapp.com",
                projectId: "app-co-eb5d0",
                storageBucket: "app-co-eb5d0.firebasestorage.app",
                messagingSenderId: "160906787270",
                appId: "1:160906787270:web:638e28599f303dfddd1ac7",
                databaseURL: "https://app-co-eb5d0-default-rtdb.firebaseio.com"
            };
            if (!firebase.apps.length) firebase.initializeApp(c);
            window.db = firebase.database();
            if (window.splashStage) window.splashStage('db');

            window.db.ref('config/branding').once('value', s => {
                if (!s.exists()) {
                    window.db.ref('/').update({
                        "config/branding/name": "LỚP HỌC CÔNG GIÁO",
                        "config/branding/logo": "",
                        "config/clearPin": "654321",
                        "config/maintenance": false,
                        "users/admin/name": "ANH QUÂN",
                        "users/admin/role": "admin",
                        "users/admin/allowPrivate": true,
                        "users/admin/isLocked": false
                    }).then(() => {
                        window.showCustomAlert("✅ Đã tự động khôi phục dữ liệu gốc! Đang tải lại app...");
                        location.reload();
                    }).catch(err => {
                        window.showCustomAlert("🚨 LỖI GHI DỮ LIỆU: " + err.message);
                    });
                }
            }).catch(err => {
                window.showCustomAlert("🚨 LỖI ĐỌC DỮ LIỆU: " + err.message + "\n👉 Hãy kiểm tra Firebase Rules!");
            });

            window.db.ref('.info/serverTimeOffset').on('value', s => window.serverOffset = s.val() || 0);

            // Đồng bộ NỘI QUY từ Firebase → cập nhật realtime cho toàn bộ học viên
            window.db.ref('config/classRules').on('value', s => {
                const box = document.getElementById('rules-content-box');
                if (!box) return;
                const val = s && s.val();
                if (val && typeof val === 'string' && val.trim()) {
                    const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
                    box.innerHTML = lines.map((line, i) => {
                        const clean = line.replace(/^\d+[\.\)]\s*/, '');
                        return `<p>${(i + 1)}. ${clean.replace(/</g, '&lt;')}</p>`;
                    }).join('');
                }
            });

            window.db.ref('config/branding').on('value', s => {
                if (s.exists()) {
                    const d = s.val();
                    window.applyBranding(d.name, d.logo);
                    if (d.splashLogo) localStorage.setItem('savedSplashLogo', d.splashLogo);
                }
                if (window.splashStage) window.splashStage('config');
                const splash = document.getElementById('splash-screen');
                const login = document.getElementById('login-screen');
                if (splash && !window.session) {
                    // TẢI TOÀN BỘ users (học sinh, giáo viên, admin) trước khi vào app
                    window.db.ref('users').once('value').then(snap => {
                        try {
                            const all = snap.val() || {};
                            const total = Object.keys(all).length;
                            const stat = document.getElementById('splash-status-text');
                            if (stat) stat.textContent = 'Đang tải dữ liệu học sinh, giáo viên, admin (' + total + ' người)';
                        } catch(e) {}
                        if (window.splashStage) window.splashStage('users');
                        if (window.splashStage) window.splashStage('rules');
                        if (window.splashStage) window.splashStage('ready');
                        // Đợi thanh % thật sự chạm 100 rồi mới ẩn
                        setTimeout(() => {
                            if (window.splashDone) window.splashDone();
                            setTimeout(() => {
                                splash.style.display = 'none';
                                splash.classList.add('hidden');
                                if (login) login.classList.remove('hidden');
                            }, 700);
                        }, 420);
                    }).catch(err => {
                        // Có lỗi vẫn cho vào để không kẹt splash
                        if (window.splashDone) window.splashDone();
                        setTimeout(() => {
                            splash.style.display = 'none';
                            splash.classList.add('hidden');
                            if (login) login.classList.remove('hidden');
                        }, 650);
                    });
                } else if (login && !window.session) {
                    login.classList.remove('hidden');
                }
            }, err => {
                window.showCustomAlert("🚨 LỖI TẢI GIAO DIỆN: " + err.message);
                document.getElementById('splash-screen').classList.add('hidden');
                document.getElementById('login-screen').classList.remove('hidden');
            });
        }
    } catch (e) {
        window.showCustomAlert("🚨 LỖI HỆ THỐNG: " + e.message);
    }
}
// ==========================================
// PHẦN 3: XỬ LÝ ĐĂNG NHẬP & ĐĂNG XUẤT
// ==========================================
window.uploadGroupAvatar = async () => {
    const fileInput = document.getElementById('group-avt-file');
    const file = fileInput.files[0];
    if(!file) return;
    
    window.showCustomAlert("⏳ Đang tải ảnh lên thư viện...");
    // Dùng đúng thư viện ImgBB đã setup sẵn trong app
    const url = await window.uploadToImgBB(file);
    
    if(url) {
        window.db.ref('groups/' + window.currentGroupChat).update({ avatar: url }).then(() => {
            window.showCustomAlert("✅ Đã cập nhật ảnh đại diện nhóm!");
            window.toggleModal('group-manage-modal', false);
            fileInput.value = ''; // Reset lại ô chọn file
        });
    } else {
        window.showCustomAlert("❌ Tải ảnh thất bại! Vui lòng thử lại.");
    }
};

// =========================================================
// NÂNG CẤP BẢO MẬT: MODAL NỘI QUY + CHỐNG DÒ MẬT KHẨU
// =========================================================
window.openRulesAgreement = (e) => {
    if (e) e.preventDefault();
    const m = document.getElementById('rules-agreement-modal');
    if (m) m.classList.remove('hidden');
};
window.closeRulesAgreement = () => {
    const m = document.getElementById('rules-agreement-modal');
    if (m) m.classList.add('hidden');
};
window.agreeRulesAndClose = () => {
    const chk = document.getElementById('agree-rules');
    if (chk) {
        chk.checked = true;
        localStorage.setItem('rulesAgreed', 'true'); // Thêm dòng này để lưu vào máy
    }
    window.closeRulesAgreement();
};

// Chống hacker dò mật khẩu: khóa tạm 30 giây sau 5 lần sai liên tiếp
window.SEC_MAX_FAILS = 5;
window.SEC_LOCK_MS = 30000;
window.secIsLocked = () => {
    const until = parseInt(localStorage.getItem('secLockUntil') || '0', 10);
    if (Date.now() < until) return Math.ceil((until - Date.now()) / 1000);
    return 0;
};
window.secLoginFail = () => {
    const fails = parseInt(localStorage.getItem('secFails') || '0', 10) + 1;
    localStorage.setItem('secFails', fails);
    if (fails >= window.SEC_MAX_FAILS) {
        localStorage.setItem('secLockUntil', Date.now() + window.SEC_LOCK_MS);
        localStorage.setItem('secFails', '0');
    }
};
window.secLoginReset = () => {
    localStorage.removeItem('secFails');
    localStorage.removeItem('secLockUntil');
};

window.handleLogin = () => {
    const i = document.getElementById('username').value.trim().toLowerCase(); 
    const p = document.getElementById('password').value.trim(); 
    const b = document.getElementById('login-btn');
    
    // BẢO MẬT: Kiểm tra khóa tạm thời do nhập sai nhiều lần
    const lockSecs = window.secIsLocked();
    if (lockSecs > 0) {
        return window.showCustomAlert('BẢO VỆ CHỐNG HACKER 🛡️', 'Nhập sai quá nhiều lần! Vui lòng chờ ' + lockSecs + ' giây rồi thử lại.', '🔒');
    }

    // Kiểm tra tích đồng ý nội quy
    const agreeChk = document.getElementById('agree-rules');
    if (agreeChk && !agreeChk.checked) {
        const row = document.querySelector('.rules-agree-row');
        if (row) {
            row.classList.remove('rules-shake');
            void row.offsetWidth;
            row.classList.add('rules-shake');
        }
        return window.showCustomAlert('CHƯA ĐỒNG Ý NỘI QUY', 'Em hãy tích vào ô đồng ý Nội quy trước khi vào hệ thống nhé!', '📜');
    }
    
    if (!i || !p) return window.showCustomAlert('LỖI ĐĂNG NHẬP', 'Vui lòng điền đủ ID và Mật khẩu!', '⚠️'); 
    
    b.innerText = "ĐANG TẢI..."; 
    b.disabled = true;
    const emailAo = i + '@kimminlai.com';

    firebase.auth().signInWithEmailAndPassword(emailAo, p).then(() => {
        window.secLoginReset(); // Đăng nhập đúng: xóa bộ đếm sai
        window.db.ref('users/' + i).once('value').then(s => {
            if (i === 'admin') { 
                window.session = { 
                    id: i, role: 'admin', name: 'ANH QUÂN', 
                    avatar: s.val()?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png', 
                    allowPrivate: true 
                }; 
                try { localStorage.setItem('cachedAvatar_' + i, window.session.avatar); localStorage.setItem('cachedName_' + i, window.session.name || ''); localStorage.setItem('lastLoginId', i); } catch(e) {}

                window.db.ref('tracking/' + i).update({ status: 'online', lastLogin: firebase.database.ServerValue.TIMESTAMP }); 
                window.startIntro();
            } else if (s.exists()) {
                const d = s.val();
                if (d.isLocked) { 
                    window.showCustomAlert('TÀI KHOẢN BỊ KHÓA 🔒', 'Lý do: ' + (d.lockReason || "Vi phạm nội quy!"), '🚫');
                    firebase.auth().signOut(); 
                    b.innerText = "VÀO HỆ THỐNG 🚀"; b.disabled = false;
                } else {
                    window.session = { 
                        id: i, role: d.role, name: d.name, 
                        avatar: d.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png', 
                        allowPrivate: d.allowPrivate !== false 
                    }; 
                    try { localStorage.setItem('cachedAvatar_' + i, window.session.avatar); localStorage.setItem('cachedName_' + i, window.session.name || ''); localStorage.setItem('lastLoginId', i); } catch(e) {}

                    window.db.ref('tracking/' + i).update({ status: 'online', lastLogin: firebase.database.ServerValue.TIMESTAMP }); 
                    window.startIntro();
                }
            } else {
                // VÁ LỖI TẠI ĐÂY: Phát hiện tài khoản đã bị xóa khỏi Database (Bóng ma)
                window.showCustomAlert('TÀI KHOẢN ĐÃ BỊ XÓA', 'Tài khoản này không còn tồn tại trên hệ thống!', '❌');
                firebase.auth().signOut();
                b.innerText = "VÀO HỆ THỐNG 🚀"; 
                b.disabled = false;
            }
        });
    }).catch((error) => { 
        b.innerText = "VÀO HỆ THỐNG 🚀"; 
        b.disabled = false; 
        window.secLoginFail(); // Đếm số lần sai để chống dò mật khẩu
        let errorMsg = 'Sai ID hoặc Mật khẩu! Các em nhập lại nhé hoặc SOS nha😘';
        if (error.code === 'auth/network-request-failed') {
            errorMsg = 'Lỗi kết nối mạng, vui lòng thử lại sau!';
        }
        window.showCustomAlert('ĐĂNG NHẬP THẤT BẠI', errorMsg, '❌');
    });
};

window.handleLogout = () => {
    // VÁ: xoá PIN cache + detach mọi listener theo session cũ
    try {
        if (window._usersRef) window._usersRef.off();
        if (window._userPassRef) window._userPassRef.off();
        if (window._groupsRef) window._groupsRef.off();
        if (window.paymentRef) window.paymentRef.off();
        if (window.currentChatRef) window.currentChatRef.off();
        if (window.typingRef) window.typingRef.off();
        window._usersRef = window._userPassRef = window._groupsRef = window.paymentRef = window.currentChatRef = window.typingRef = null;
    } catch(e) { console.warn('[logout cleanup]', e); }
 
    if (window.session && window.db) {
        window.db.ref('tracking/' + window.session.id).update({ status: 'offline', lastLogout: firebase.database.ServerValue.TIMESTAMP }).then(() => {
            firebase.auth().signOut().then(() => location.reload());
        }); 
    } else {
        location.reload(); 
    }
};
// ==========================================
// PHẦN 4: CHUẨN BỊ DỮ LIỆU & VÀO APP
// ==========================================

window.prepareAppData = async () => {
    // =========================================================
    // TẢI DỮ LIỆU PHÂN LUỒNG THEO VAI TRÒ
    //  - Học sinh (hs / cuu_hs): CHỈ tải hồ sơ + điểm + bạn bè của CHÍNH MÌNH.
    //    (users tải "gọn" chỉ để hiển thị tên/avatar khi chat, KHÔNG tải điểm HS khác.)
    //  - Giáo viên (gv): tải toàn bộ danh sách users + toàn bộ điểm + tracking
    //    để phục vụ chấm điểm / điểm danh / đóng tiền.
    //  - Quản trị: tải TẤT CẢ — thêm payments, payment_history…
    // =========================================================
    try {
        const role = window.session.role;
        const uid = window.session.id;
        const dataPromises = [
            window.db.ref('users').once('value'),   // cần cho chat/kết nối
            window.db.ref('config').once('value')
        ];

        if (role === 'admin' || role === 'ql') {
            // ADMIN — tải TẤT CẢ
            dataPromises.push(window.db.ref('grades').once('value'));
            dataPromises.push(window.db.ref('tracking').once('value'));
            dataPromises.push(window.db.ref('payments').once('value'));
                            dataPromises.push(window.db.ref('payment_history').limitToLast(200).once('value'));
            dataPromises.push(window.db.ref(`friends/${uid}`).once('value'));
        } else if (role === 'gv') {
            // GIÁO VIÊN — tải toàn bộ điểm + tracking để làm việc với HS
            dataPromises.push(window.db.ref('grades').once('value'));
            dataPromises.push(window.db.ref('tracking').once('value'));
            dataPromises.push(window.db.ref('payments').once('value'));
            dataPromises.push(window.db.ref(`friends/${uid}`).once('value'));
        } else {
            // HỌC SINH / CỰU HỌC SINH — CHỈ dữ liệu cá nhân, không đụng HS khác
            dataPromises.push(window.db.ref(`friends/${uid}`).once('value'));
            dataPromises.push(window.db.ref(`grades/${uid}`).once('value'));
            dataPromises.push(window.db.ref(`payments/${uid}`).once('value'));
        }
        await Promise.all(dataPromises);
    } catch (e) {
        console.error("Lỗi chuẩn bị dữ liệu:", e);
    }
};

window.startIntro = () => {
    document.getElementById('login-screen').classList.add('hidden');

    // Không re-show splash nữa (nó chỉ dành cho lần boot đầu). Dùng luôn
    // intro-overlay để hiển thị avatar + vòng xoay trong lúc chuẩn bị dữ liệu,
    // tránh xung đột với MutationObserver của splash gây màn hình đen/trắng.
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.__hidden = true;
        splash.classList.add('splash-out','hidden');
        splash.style.setProperty('display','none','important');
        try { if (window.__splashObserver) window.__splashObserver.disconnect(); } catch(_){}
    }

    const o   = document.getElementById('intro-overlay');
    const img = document.getElementById('intro-img');
    if (img && window.session && window.session.avatar) img.src = window.session.avatar;
    if (o) {
        o.classList.remove('hidden');
        o.style.removeProperty('display');
        o.style.opacity = '1';
    }

    // CHỐNG TREO: nếu mạng chậm / Firebase không phản hồi, vẫn vào app sau 7 giây
    const _prep = Promise.resolve(window.prepareAppData ? window.prepareAppData() : null);
    const _timeout = new Promise(res => setTimeout(res, 7000));
    // PHAO CỨU SINH: dù có chuyện gì, tối đa 12 giây phải vào được app
    if (window.__enterGuard) clearTimeout(window.__enterGuard);
    window.__enterGuard = setTimeout(() => {
        const m = document.getElementById('main-screen');
        if (m && m.classList.contains('hidden')) {
            console.warn('[startIntro] guard: ép vào app');
            try { window.enterApp(); } catch (e) {
                console.error(e);
                m.classList.remove('hidden'); m.style.removeProperty('display');
            }
        }
        const ov = document.getElementById('intro-overlay');
        if (ov) { ov.classList.add('hidden'); ov.style.setProperty('display','none','important'); }
    }, 12000);

    Promise.race([_prep, _timeout])
        .catch(e => console.error('prepareAppData error:', e))
        .finally(() => {
            setTimeout(() => {
                document.body.classList.add('shrink-anim');
                setTimeout(() => {
                    document.body.classList.remove('shrink-anim');
                    if (o) {
                        o.classList.add('hidden');
                        o.style.setProperty('display','none','important');
                        o.style.opacity = '0';
                    }
                    if (window.__enterGuard) { clearTimeout(window.__enterGuard); window.__enterGuard = null; }
                    try { window.enterApp(); }
                    catch (err) {
                        console.error('enterApp error:', err);
                        // fallback: chắc chắn hiện main-screen
                        const m = document.getElementById('main-screen');
                        if (m) { m.classList.remove('hidden'); m.style.removeProperty('display'); }
                    }
                }, 850);
            }, 800);
        });
};

window.enterApp = () => { 
    // CHỐT AN TOÀN: ép ẩn splash + intro-overlay bằng inline style + hidden class.
    // Vì cả 2 lớp phủ này có z-index rất cao (99999 / 10000) — nếu còn sót
    // sẽ che kín main-screen thành 1 màu đen/trắng đúng như lỗi bạn gặp.
    ['splash-screen','intro-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.__hidden = true;
        el.classList.add('hidden');
        el.style.setProperty('display','none','important');
        el.style.opacity = '0';
    });
    try { if (window.__splashObserver) window.__splashObserver.disconnect(); } catch(_){}

    // VÁ LỖI: Gọi xin quyền thông báo ngay khi vào app
    if(typeof window.requestNoti === 'function') window.requestNoti();

    const ms = document.getElementById('main-screen');
    if (ms) { ms.classList.remove('hidden'); ms.style.removeProperty('display'); }
    document.getElementById('display-name-real').innerText = window.session.name; 
    document.getElementById('display-role').innerText = window.roleLabel(window.session.role); 
    document.getElementById('user-avatar').src = window.session.avatar; 
    
    if (window.isAdminLevel() || window.session.role === 'gv') {
        const editorZone = document.getElementById('rules-editor-zone');
        if (editorZone) editorZone.classList.remove('hidden');
    }

    const r = window.session.role;
const adminTabs = ['nav-myprofile', 'nav-connect', 'nav-chat', 'nav-personal', 'nav-attendance', 'nav-payments', 'nav-manage', 'nav-rules', 'nav-tracking', 'nav-avatar', 'nav-users', 'nav-branding', 'nav-settings', 'nav-pincenter', 'nav-clear-data'];
const qlTabs = ['nav-myprofile', 'nav-connect', 'nav-chat', 'nav-personal', 'nav-attendance', 'nav-payments', 'nav-manage', 'nav-rules', 'nav-tracking', 'nav-avatar', 'nav-users', 'nav-branding', 'nav-settings'];
const hsTabs = ['nav-myprofile', 'nav-connect', 'nav-chat', 'nav-personal', 'nav-rules', 'nav-settings'];
const gvTabs = ['nav-myprofile', 'nav-connect', 'nav-chat', 'nav-attendance', 'nav-payments', 'nav-manage', 'nav-rules', 'nav-users', 'nav-settings'];

    
    document.querySelectorAll('.nav-btn').forEach(b => { 
        if (!b.onclick || !b.onclick.toString().includes('handleLogout')) b.classList.add('hidden'); 
    });

    let activeTabs = (window.isBoss() || window.isDemoMode) ? adminTabs : (r === 'ql' ? qlTabs : (r === 'gv' ? gvTabs : hsTabs));
    activeTabs.forEach(id => { 
        const btn = document.getElementById(id); 
        if(btn) btn.classList.remove('hidden');     
    });

    {
        const roleSelect = document.getElementById('new-role');
        if (roleSelect && !window.isBoss()) {
            for (let i = 0; i < roleSelect.options.length; i++) {
                if (roleSelect.options[i].value === 'ql') roleSelect.options[i].style.display = 'none';
            }
        }
    }
    if (window.session.role === 'gv') {
        const roleSelect = document.getElementById('new-role');
        if (roleSelect) {
            for (let i = 0; i < roleSelect.options.length; i++) {
                if (roleSelect.options[i].value === 'gv') roleSelect.options[i].style.display = 'none'; 
            }
            roleSelect.value = 'hs'; 
        }
    }

    if (window.isAdminLevel() || window.isDemoMode) { 
        window.switchTab('manage'); 
        if(typeof window.loadUsers === 'function') window.loadUsers(); 
        if(typeof window.loadTracking === 'function') window.loadTracking(); 
        if(typeof window.loadMasterGrades === 'function') window.loadMasterGrades(); 
        if(typeof window.loadAdminSpy === 'function') window.loadAdminSpy(); 
    } 
    else if (r === 'gv') { 
        window.switchTab('manage'); 
        if(typeof window.loadUsers === 'function') window.loadUsers(); 
        if(typeof window.loadMasterGrades === 'function') window.loadMasterGrades(); 
    } 
    else { 
        window.switchTab('connect'); 
        if(typeof window.loadUsers === 'function') window.loadUsers(); 
    }

    const qrEl = document.getElementById('connect-my-qr');
    if(qrEl) qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=user=${window.session.id}`;

    if(typeof window.initBankCardUI === 'function') window.initBankCardUI(); 
    if(typeof window.loadRealtime === 'function') window.loadRealtime(); 
    if(typeof window.loadGroups === 'function') window.loadGroups(); 
    if(typeof window.loadFriendRequests === 'function') window.loadFriendRequests();

    // BẢN VÁ: HỆ THỐNG XỬ LÝ CHẤM ĐỎ THÔNG MINH
    window.db.ref('unread/' + window.session.id).on('value', s => {
        let unreadObj = s.val() || {};
        
        // CHỐNG CHẤM ĐỎ ẢO: Nếu đang mở khung chat của ai, tự động "Đã xem" tin nhắn của người đó luôn
        if (window.currentPrivateConvo) {
    const ids = window.currentPrivateConvo.split('_');
    const targetId = window.currentPrivateTarget || (ids[0] === window.session.id ? ids.slice(1).join('_') : ids[0]);
            
            if (unreadObj[targetId]) {
                window.db.ref('unread/' + window.session.id + '/' + targetId).remove();
                delete unreadObj[targetId]; 
            }
        }

        const hasUnread = Object.keys(unreadObj).length > 0;
        const dots = ['main-noti-dot', 'menu-noti-dot', 'private-noti-dot'];
        
        dots.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList[hasUnread ? 'remove' : 'add']('hidden');
        });
        
        window.unreadData = hasUnread ? unreadObj : null;
        
        if(typeof window.renderRecentChats === 'function') window.renderRecentChats();
        if(typeof window.loadAnnouncements === 'function') window.loadAnnouncements();
    });

    const urlParams = new URLSearchParams(window.location.search); 
    const targetUser = urlParams.get('user');
    if(targetUser && targetUser !== window.session.id && typeof window.openUserProfile === 'function') { 
        window.openUserProfile(targetUser); 
    }
};

// ==========================================
// PHẦN 5: ĐIỀU KHIỂN GIAO DIỆN MODAL & TAB
// ==========================================

window.toggleModal = (id, show) => { 
    const m = document.getElementById(id); 
    if (m) m.classList[show ? 'remove' : 'add']('hidden'); 
};

window.toggleSidebar = (show) => { 
    const s = document.getElementById('sidebar'); 
    if (s) { 
        s.classList[show ? 'add' : 'remove']('open'); 
        if(show && window.session) {
            const dot = document.getElementById('main-noti-dot');
            if(dot) dot.classList.add('hidden');
        }
    } 
};

window.switchTab = (id) => { 
    document.querySelectorAll('.tab-pane').forEach(t => t.classList.add('hidden')); 
    const tb = document.getElementById('tab-' + id); 
    if (tb) { 
        tb.classList.remove('hidden'); 
        tb.classList.add('fade-in'); 
    }
    window.toggleSidebar(false); 
    
    if(id === 'chat') { 
        if(typeof window.openChatChannel === 'function') window.openChatChannel('global'); 
        const dot = document.getElementById('menu-noti-dot');
        if(dot) dot.classList.add('hidden'); 
    } 
    if(id === 'myprofile' && typeof window.loadMyProfileTab === 'function') { 
        window.loadMyProfileTab(); 
    } 
};

window.initBankCardUI = () => {
    if(!window.session) return;
    const nameEl = document.getElementById('my-bank-name');
    const idEl = document.getElementById('my-bank-id');
    const avtEl = document.getElementById('my-bank-avt');
    
    if(nameEl) nameEl.innerText = window.session.name;
    if(idEl) idEl.innerText = "ID: " + window.session.id.toUpperCase();
    if(avtEl) avtEl.src = window.session.avatar;
};

// CÔNG THỨC TÍNH ĐIỂM (DÙNG CHUNG)
window.calcGPA = (m, p, t, thi) => {
    const vm = parseFloat(m) || 0, vp = parseFloat(p) || 0, vt = parseFloat(t) || 0, vth = parseFloat(thi) || 0;
    if (vth === 0) return "0.0";
    const g = (vm + vp + (vt * 2) + (vth * 3)) / 7;
    return isNaN(g) ? "0.0" : g.toFixed(1);
};

window.calcYearly = (a1, a2) => { 
    const v1 = parseFloat(a1) || 0; 
    const v2 = parseFloat(a2) || 0; 
    if (v2 === 0) return "-"; // KHÔNG CÒN ĐIỀU KIỆN isHk2Locked NỮA
    const y = (v1 + (v2 * 2)) / 3; 
    return isNaN(y) ? "0.0" : y.toFixed(1); 
};

// TẢI ĐIỂM CÁ NHÂN CHO HỌC SINH (HIỂN THỊ TRỰC TIẾP, KHÔNG KHÓA KỲ 2)
window.loadRealtime = () => {
    if (!window.session || window.session.role !== 'hs') return;
    
    window.db.ref('grades/' + window.session.id).on('value', sn => {
        const g = sn.val() || {}; 
        const h1 = g.hk1 || { m: 0, p: 0, t: 0, thi: 0, hk: '-' }; 
        const h2 = g.hk2 || { m: 0, p: 0, t: 0, thi: 0, hk: '-' };
        
        const t1 = window.calcGPA(h1.m, h1.p, h1.t, h1.thi); 
        const t2 = window.calcGPA(h2.m, h2.p, h2.t, h2.thi); 
        const cn = window.calcYearly(t1, t2);
        
        const ui = document.getElementById('personal-grades-ui'); 
        if (ui) {
            ui.innerHTML = `<div class="scroll-x"><table class="master-table"><tr><th class="sticky-col">KỲ</th><th>M</th><th>15P</th><th>1T</th><th>THI</th><th>TB</th><th>H.KIỂM</th></tr><tr><td class="sticky-col"><b>HK1</b></td><td>${h1.m}</td><td>${h1.p}</td><td>${h1.t}</td><td>${h1.thi}</td><td style="color:var(--pink);font-weight:bold;">${t1}</td><td><b style="color:#4CAF50">${h1.hk || '-'}</b></td></tr><tr><td class="sticky-col"><b>HK2</b></td><td>${h2.m}</td><td>${h2.p}</td><td>${h2.t}</td><td>${h2.thi}</td><td style="color:var(--pink);font-weight:bold;">${t2}</td><td><b style="color:#4CAF50">${h2.hk || '-'}</b></td></tr><tr><td class="sticky-col"><b>CẢ NĂM</b></td><td colspan="4" style="text-align:right"><b>TỔNG KẾT:</b></td><td colspan="2" style="color:red;font-size:18px;font-weight:bold;">${cn}</td></tr></table></div>`;
        }
    });
};
// =====================================================================
// MÁY QUÉT QR TOÀN MÀN HÌNH (KẾT BẠN) - STYLE NGÂN HÀNG
// =====================================================================
window.__qrFs = { instance: null, torchOn: false, running: false };

window.startQRScanner = () => window.openFullScanner();
window.stopQRScanner  = () => window.closeFullScanner();

window.openFullScanner = () => {
    const overlay = document.getElementById('qr-fullscreen-scanner');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    // Reset trạng thái đèn flash
    const torchBtn = document.getElementById('qr-fs-torch');
    if (torchBtn) torchBtn.classList.remove('active');
    window.__qrFs.torchOn = false;

    if (typeof Html5Qrcode === 'undefined') {
        window.showCustomAlert('LỖI', 'Thư viện quét QR chưa sẵn sàng, vui lòng tải lại trang!');
        return;
    }

    // Tạo instance mới cho mỗi lần mở
    try {
        window.__qrFs.instance = new Html5Qrcode('qr-fs-reader', { verbose: false });
    } catch (e) {
        console.error(e);
        window.showCustomAlert('LỖI KHỞI TẠO', 'Không thể khởi tạo máy quét: ' + e.message);
        return;
    }

    const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: window.innerHeight / window.innerWidth,
        disableFlip: false
    };

    window.__qrFs.instance.start(
        { facingMode: { exact: 'environment' } },
        config,
        (decodedText) => window.__handleConnectQR(decodedText),
        () => { /* im lặng lỗi từng khung */ }
    ).then(() => {
        window.__qrFs.running = true;
    }).catch(() => {
        // Fallback: một số máy không hỗ trợ 'exact', thử lại với facingMode thường
        window.__qrFs.instance.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => window.__handleConnectQR(decodedText),
            () => {}
        ).then(() => { window.__qrFs.running = true; })
         .catch((err) => {
            console.error('Lỗi mở camera:', err);
            window.showCustomAlert('KHÔNG MỞ ĐƯỢC CAMERA', 'Vui lòng cấp quyền camera cho trình duyệt rồi thử lại.\n\n' + (err?.message || err));
            window.closeFullScanner();
        });
    });
};

window.__handleConnectQR = (decodedText) => {
    if (!decodedText) return;
    if (decodedText.includes('user=')) {
        const uid = decodedText.split('user=')[1].split('&')[0];
        window.closeFullScanner();
        if (typeof window.openUserProfile === 'function') window.openUserProfile(uid);
    } else {
        window.closeFullScanner();
        window.showCustomAlert('❌ LỖI', 'Mã QR này không thuộc hệ thống lớp học!');
    }
};

window.closeFullScanner = () => {
    const overlay = document.getElementById('qr-fullscreen-scanner');
    const finalize = () => {
        window.__qrFs.instance = null;
        window.__qrFs.running = false;
        window.__qrFs.torchOn = false;
        if (overlay) overlay.classList.add('hidden');
        const input = document.getElementById('qr-fs-file-input');
        if (input) input.value = '';
    };
    const inst = window.__qrFs.instance;
    if (inst && window.__qrFs.running) {
        inst.stop().then(() => inst.clear()).catch(()=>{}).finally(finalize);
    } else {
        finalize();
    }
};

window.toggleQRTorch = () => {
    const inst = window.__qrFs.instance;
    const btn = document.getElementById('qr-fs-torch');
    if (!inst || !window.__qrFs.running) return;
    const next = !window.__qrFs.torchOn;
    // Ưu tiên API mới của html5-qrcode
    try {
        const caps = inst.getRunningTrackCameraCapabilities && inst.getRunningTrackCameraCapabilities();
        if (caps && caps.torchFeature && caps.torchFeature().isSupported()) {
            caps.torchFeature().apply(next).then(() => {
                window.__qrFs.torchOn = next;
                if (btn) btn.classList.toggle('active', next);
            }).catch(() => window.showCustomAlert('KHÔNG BẬT ĐƯỢC ĐÈN', 'Thiết bị hoặc trình duyệt không hỗ trợ đèn flash.'));
            return;
        }
    } catch(_) {}
    // Fallback: applyVideoConstraints
    try {
        inst.applyVideoConstraints({ advanced: [{ torch: next }] }).then(() => {
            window.__qrFs.torchOn = next;
            if (btn) btn.classList.toggle('active', next);
        }).catch(() => window.showCustomAlert('KHÔNG BẬT ĐƯỢC ĐÈN', 'Thiết bị hoặc trình duyệt không hỗ trợ đèn flash.'));
    } catch (e) {
        window.showCustomAlert('KHÔNG BẬT ĐƯỢC ĐÈN', 'Thiết bị hoặc trình duyệt không hỗ trợ đèn flash.');
    }
};

window.scanQRFromImage = (file) => {
    if (!file) return;
    // Dừng camera để dùng chung instance quét ảnh
    const useInstance = () => {
        let inst = window.__qrFs.instance;
        const doScan = () => {
            inst.scanFile(file, true)
                .then((decodedText) => window.__handleConnectQR(decodedText))
                .catch(() => {
                    window.showCustomAlert('KHÔNG ĐỌC ĐƯỢC', 'Ảnh không chứa mã QR hợp lệ. Hãy chọn ảnh rõ nét hơn.');
                    // Mở lại camera sau khi báo lỗi
                    window.closeFullScanner();
                    setTimeout(() => window.openFullScanner(), 200);
                });
        };
        if (inst && window.__qrFs.running) {
            inst.stop().then(() => { window.__qrFs.running = false; doScan(); }).catch(doScan);
        } else {
            if (!inst) {
                try { inst = new Html5Qrcode('qr-fs-reader', { verbose: false }); window.__qrFs.instance = inst; } catch(e) { return; }
            }
            doScan();
        }
    };
    useInstance();
};

window.loadMyProfileTab = () => {
    if(!window.session) return;
    window.db.ref('users/' + window.session.id).once('value').then(s => {
        const u = s.val() || {}; 
        document.getElementById('my-tab-name').innerText = u.name || window.session.name; 
        document.getElementById('my-tab-id').innerText = "ID: " + window.session.id.toUpperCase(); 
        document.getElementById('my-tab-avatar').src = u.avatar || window.session.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        
        const bYear = document.getElementById('my-tab-birthyear');
        if(bYear) bYear.innerText = u.birthYear ? "🎂 Sinh năm: " + u.birthYear : "";
        
        const quoteEl = document.getElementById('my-tab-quote'); 
        if (quoteEl) {
            if (u.quote) { 
                quoteEl.innerHTML = "❝ " + window.escapeHTML(u.quote) + " ❞"; 
                quoteEl.classList.remove('hidden'); 
            } else { 
                quoteEl.classList.add('hidden'); 
            }
        }
        
        const bioEl = document.getElementById('my-tab-bio');
        if(bioEl) bioEl.innerHTML = window.escapeHTML(u.bio) || "Chưa có tiểu sử...";
        
        const cohortEl = document.getElementById('my-tab-cohort'); 
        if (cohortEl) {
            if (u.role === 'cuu_hs' && u.cohort) { 
                cohortEl.innerText = `🎓 ${u.cohort}`; 
                cohortEl.classList.remove('hidden'); 
            } else { 
                cohortEl.classList.add('hidden'); 
            }
        }
    });
};

window.openSelfEdit = () => { 
    window.db.ref('users/' + window.session.id).once('value').then(s => { 
        const u = s.val() || {}; 
        document.getElementById('self-birthyear').value = u.birthYear || ''; 
        document.getElementById('self-quote').value = u.quote || ''; 
        document.getElementById('self-bio').value = u.bio || ''; 
        window.toggleModal('user-profile-modal', false); 
        window.toggleModal('self-edit-modal', true); 
    }); 
};

window.saveSelfProfile = () => { 
    const by = document.getElementById('self-birthyear').value.trim(); 
    const quote = document.getElementById('self-quote').value.trim(); 
    const bio = document.getElementById('self-bio').value.trim(); 
    
    window.db.ref('users/' + window.session.id).update({ 
        birthYear: by, 
        quote: quote, 
        bio: bio 
    }).then(() => { 
        window.showCustomAlert("✅ Cập nhật hồ sơ thành công!"); 
        window.toggleModal('self-edit-modal', false); 
        window.loadMyProfileTab(); 
        if(typeof window.openUserProfile === 'function') window.openUserProfile(window.session.id);
    }); 
};
// ==========================================
// PHẦN 7: XEM HỒ SƠ & QUẢN LÝ BẠN BÈ
// ==========================================

window.openUserProfile = (uid) => {
    if (!uid) return;
    window.db.ref('users/' + uid).once('value').then(snap => {
        if (!snap.exists()) return window.showCustomAlert("❌ Không tìm thấy người dùng này!");
        const u = snap.val();
        
        document.getElementById('profile-name').innerText = u.name;
        document.getElementById('profile-id').innerText = "ID: " + uid.toUpperCase();
        document.getElementById('profile-avatar').src = u.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        document.getElementById('profile-avatar').classList.remove('hidden');
        
        const bYear = document.getElementById('profile-birthyear');
        if(bYear) bYear.innerText = u.birthYear ? "🎂 Sinh năm: " + u.birthYear : "";

        const quoteEl = document.getElementById('profile-quote');
        if(u.quote) { 
            quoteEl.innerHTML = "❝ " + window.escapeHTML(u.quote) + " ❞"; 
            quoteEl.classList.remove('hidden'); 
        } else { 
            quoteEl.classList.add('hidden'); 
        }

        const bioEl = document.getElementById('profile-bio');
        bioEl.innerHTML = window.escapeHTML(u.bio) || "Người này khá bí ẩn, chưa viết tiểu sử...";

        const friendBtn = document.getElementById('profile-friend-btn');
        const chatBtn = document.getElementById('profile-chat-btn');
        const editBtn = document.getElementById('profile-self-edit-btn');

        friendBtn.classList.add('hidden');
        chatBtn.classList.add('hidden');
        editBtn.classList.add('hidden');

        if (uid === window.session.id) {
            editBtn.classList.remove('hidden');
        } else {
            window.db.ref(`friends/${window.session.id}/${uid}`).once('value').then(fSnap => {
                const status = fSnap.val();
                
                if (status === 'accepted') {
                    chatBtn.classList.remove('hidden');
                    chatBtn.onclick = () => { window.toggleModal('user-profile-modal', false); if(typeof window.openDirectChat === 'function') window.openDirectChat(uid); };
                    
                    // NÚT HỦY KẾT BẠN
                    friendBtn.innerHTML = "❌ HỦY KẾT BẠN";
                    friendBtn.style.background = "#dc3545"; // Nền đỏ
                    friendBtn.classList.remove('hidden');
                    friendBtn.onclick = () => window.unfriendUser(uid);

                } else if (status === 'pending') {
                    friendBtn.innerText = "⏳ ĐÃ GỬI LỜI MỜI";
                    friendBtn.style.background = "#888";
                    friendBtn.classList.remove('hidden');
                    friendBtn.onclick = null;
                } else if (status === 'requested') {
                    friendBtn.innerText = "✅ CHẤP NHẬN";
                    friendBtn.style.background = "#4CAF50";
                    friendBtn.classList.remove('hidden');
                    friendBtn.onclick = () => {
                        window.acceptFriend(uid);
                        window.toggleModal('user-profile-modal', false);
                    };
                } else {
                    friendBtn.innerText = "➕ KẾT BẠN";
                    friendBtn.style.background = "#1877F2";
                    friendBtn.classList.remove('hidden');
                    friendBtn.onclick = () => window.sendFriendRequest(uid);
                }
            });
        }
        window.toggleModal('user-profile-modal', true);
    });
};


window.sendFriendRequest = (targetId) => {
    if (targetId === window.session.id) return;
    window.db.ref(`friends/${window.session.id}/${targetId}`).set('pending');
    window.db.ref(`friends/${targetId}/${window.session.id}`).set('requested').then(() => {
        window.showCustomAlert("🚀 Đã gửi lời mời kết bạn thành công!");
        window.openUserProfile(targetId);
    });
};

window.loadFriendRequests = () => {
    window.db.ref(`friends/${window.session.id}`).on('value', async snap => {
        const data = snap.val() || {};
        let html = '';
        let count = 0;
        
        for (let uid in data) {
            if (data[uid] === 'requested') {
                // CÁCH MỚI: Nếu máy tải danh sách chậm, tự mò thẳng vào Database để lấy thông tin
                let u = window.allUsersMap ? window.allUsersMap[uid] : null;
                if (!u) {
                    const s = await window.db.ref('users/' + uid).once('value');
                    u = s.val();
                }
                
                // Nếu tìm mà vẫn không ra (bị Admin xóa thật) thì mới ẩn
                if (!u) continue; 

                count++;
                html += `<div class="card shadow-lux" style="display:flex; justify-content:space-between; align-items:center; padding:10px;">
                    <b>${window.escapeHTML(String(u.name || ''))}</b>
                    <div>
                        <button class="btn-royal" style="padding:5px 10px; background:#4CAF50; font-size:12px;" onclick="window.acceptFriend('${uid}')">ĐỒNG Ý</button>
                        <button class="btn-royal" style="padding:5px 10px; background:#dc3545; font-size:12px;" onclick="window.rejectFriend('${uid}')">XÓA</button>
                    </div>
                </div>`;
            }
        }
        
        const zone = document.getElementById('friend-requests-zone');
        const list = document.getElementById('friend-requests-list');
        if (count > 0) {
            zone.classList.remove('hidden');
            list.innerHTML = html;
        } else {
            zone.classList.add('hidden');
        }
        window.renderFriendList(data);
    });
};

window.acceptFriend = (uid) => {
    const updates = {};
    updates[`friends/${window.session.id}/${uid}`] = 'accepted';
    updates[`friends/${uid}/${window.session.id}`] = 'accepted';
    window.db.ref().update(updates).then(() => window.showCustomAlert("🎉 Hai bạn đã trở thành bạn bè!"));
};

window.rejectFriend = (uid) => {
    window.showCustomConfirm("XÁC NHẬN", "Xác nhận xóa liên kết với người này?", () => {
        window.db.ref(`friends/${window.session.id}/${uid}`).remove();
        window.db.ref(`friends/${uid}/${window.session.id}`).remove();
    });
};

window.renderFriendList = async (friendData) => {
    let html = '';
    let count = 0;
    
    for (let uid in friendData) {
        if (friendData[uid] === 'accepted') {
            // Tự động mò lấy tên nếu máy tải chậm
            let u = window.allUsersMap ? window.allUsersMap[uid] : null;
            if (!u) {
                const s = await window.db.ref('users/' + uid).once('value');
                u = s.val();
            }
            
            if (!u) continue; // Nếu bị Admin xóa thật thì mới ẩn

            count++;
            const avt = u.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
            
            // BẢN VÁ: Bọc window.escapeHTML(u.name)
            html += `<button class="tt-item" onclick="window.openUserProfile('${uid}')">
                <div class="tt-avt-wrap"><img src="${avt}" class="tt-avt"></div>
                <div class="tt-info"><div class="tt-name">${window.escapeHTML(u.name)}</div><span class="tt-preview">ID: ${uid.toUpperCase()}</span></div>
                <div class="tt-action"><i class="fa-solid fa-chevron-right"></i></div>
            </button>`;
        }
    }
    
    const friendsListEl = document.getElementById('my-friends-list');
    if(friendsListEl) {
        friendsListEl.innerHTML = html || '<p style="text-align:center; color:#888; font-size:13px; margin-top:20px;">Chưa có bạn bè trong danh sách.</p>';
    }
    const badgeEl = document.getElementById('friend-count-badge');
    if(badgeEl) badgeEl.innerText = count;
};

window.unfriendUser = (uid) => {
    window.showCustomConfirm("HỦY KẾT BẠN", "Bạn có chắc chắn muốn hủy kết bạn với người này không?", () => {
        // Xóa liên kết từ cả 2 phía trên Firebase
        window.db.ref(`friends/${window.session.id}/${uid}`).remove();
        window.db.ref(`friends/${uid}/${window.session.id}`).remove();
        
        if(typeof window.showCustomAlert === 'function') {
            window.showCustomAlert("THÀNH CÔNG", "Đã đường ai nấy đi!", "✅");
        }
        window.toggleModal('user-profile-modal', false);
    });
};

// ==========================================
// PHẦN 8: QUẢN LÝ ĐIỂM SỐ & XUẤT EXCEL
// ==========================================

// TẢI BẢNG ĐIỂM TỔNG HỢP (DÀNH CHO ADMIN & GIÁO VIÊN)
window.loadMasterGrades = () => {
    if (!window.db || !window.session) return;
    window.db.ref('grades').on('value', sGrades => {
        const gradesData = sGrades.val() || {};
        window.db.ref('users').once('value').then(sUsers => {
            const usersData = sUsers.val() || {};
            let html = '';
            for (let id in usersData) {
                const u = usersData[id];
                // Chỉ hiển thị học sinh và cựu học sinh trong bảng điểm
                if (u.role !== 'hs' && u.role !== 'cuu_hs') continue;
                
                const g = gradesData[id] || {};
                const h1 = g.hk1 || { m:0, p:0, t:0, thi:0 };
                const h2 = g.hk2 || { m:0, p:0, t:0, thi:0 };
                
                const t1 = window.calcGPA(h1.m, h1.p, h1.t, h1.thi);
                const t2 = window.calcGPA(h2.m, h2.p, h2.t, h2.thi);
                const cn = window.calcYearly(t1, t2);

                // BẢN VÁ: Bọc window.escapeHTML(u.name) để chặn XSS
                html += `<tr onclick="window.openEditScore('${id}', '${window.escapeHTML(u.name)}')" style="cursor:pointer;">
                    <td class="sticky-col"><b>${window.escapeHTML(u.name)}</b><br><small>${id.toUpperCase()}</small></td>
                    <td>${h1.m}</td><td>${h1.p}</td><td>${h1.t}</td><td>${h1.thi}</td><td style="background:var(--soft); font-weight:bold;">${t1}</td>
                    <td>${h2.m}</td><td>${h2.p}</td><td>${h2.t}</td><td>${h2.thi}</td><td style="background:var(--soft); font-weight:bold;">${t2}</td>
                    <td style="color:red; font-weight:bold;">${cn}</td>
                </tr>`;
            }
            const body = document.getElementById('master-grade-body');
            if(body) {
                body.innerHTML = html || '<tr><td colspan="12" style="text-align:center; padding:20px;">Chưa có dữ liệu điểm học sinh</td></tr>';
            }
        });
    });
};

// MỞ CỬA SỔ SỬA ĐIỂM CHO TỪNG HỌC SINH
window.openEditScore = (id, name) => {
    // Chỉ Admin và Giáo viên mới có quyền sửa điểm
    if (!window.isAdminLevel() && window.session.role !== 'gv') return;
    
    const idInput = document.getElementById('score-u-id');
    const nameDisp = document.getElementById('score-u-name');
    if(idInput) idInput.value = id;
    if(nameDisp) nameDisp.innerText = name + " (" + id.toUpperCase() + ")";
    
    window.loadStudentScoreIntoModal();
    window.toggleModal('score-modal', true);
};

// ĐƯA DỮ LIỆU ĐIỂM TỪ FIREBASE VÀO CÁC Ô NHẬP LIỆU TRONG MODAL
window.loadStudentScoreIntoModal = () => {
    const id = document.getElementById('score-u-id').value;
    const term = document.getElementById('score-term').value;
    if(!id) return;

    window.db.ref(`grades/${id}/hk${term}`).once('value').then(s => {
        const d = s.val() || { m:0, p:0, t:0, thi:0, hk:'Tốt' };
        document.getElementById('score-m').value = d.m || 0;
        document.getElementById('score-15p').value = d.p || 0;
        document.getElementById('score-1t').value = d.t || 0;
        document.getElementById('score-thi').value = d.thi || 0;
        document.getElementById('score-conduct').value = d.hk || 'Tốt';
    });
};


// XUẤT TOÀN BỘ BẢNG ĐIỂM RA FILE EXCEL CHUẨN (.XLSX) - CHỈ LẤY TÊN
window.exportExcel = () => {
    const table = document.querySelector('.master-table');
    if (!table) return window.showCustomAlert("Không tìm thấy dữ liệu bảng điểm để xuất!");

    try {
        // 1. Tạo một bản sao của bảng để không làm mất hiển thị ID trên web
        const cloneTable = table.cloneNode(true);

        // 2. Xóa sạch ID, chỉ giữ lại đúng Tên học sinh
        const rows = cloneTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const tdFirst = row.querySelector('td:first-child');
            if (tdFirst) {
                // Rút trích thẻ chứa tên (thẻ <b>)
                const bTag = tdFirst.querySelector('b');
                
                // Lấy đúng cái tên, bỏ qua phần ID
                const nameOnly = bTag ? bTag.innerText : tdFirst.innerText.split('\n')[0]; 
                
                // Trả lại ô đó chỉ chứa mỗi tên sạch sẽ
                tdFirst.innerText = nameOnly;
            }
        });

        // 3. Xuất file bằng thư viện
        const workbook = XLSX.utils.table_to_book(cloneTable, { sheet: "Bảng Điểm" });
        const fileName = "Bang_Diem_Tong_Ket_" + window.getDateStr() + ".xlsx";
        XLSX.writeFile(workbook, fileName);

        if(typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('THÀNH CÔNG', 'Đã xuất file Excel chỉ chứa Tên và Điểm!', '✅');
        }
    } catch (error) {
        if(typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('LỖI', 'Không thể xuất file: ' + error.message, '❌');
        } else {
            alert('Lỗi xuất file: ' + error.message);
        }
    }
};

// ==========================================
// PHẦN 9: HỆ THỐNG CHAT & TẢI ẢNH (IMGBB)
// ==========================================

// ĐIỀU PHỐI CÁC KÊNH CHAT
window.openChatChannel = (type) => {
    // 1. Cập nhật màu sắc nút bấm
    const btnMap = { 'global': 'btn-chat-global', 'private': 'btn-chat-private', 'group': 'btn-chat-group' };
    for (let k in btnMap) {
        const btn = document.getElementById(btnMap[k]);
        if (btn) {
            btn.style.background = (k === type) ? 'var(--pink)' : 'var(--border)';
            btn.style.color = (k === type) ? 'white' : 'var(--text)';
        }
    }

    // 2. Ẩn tất cả các vùng và vùng giám sát
    const zones = ['chat-global-zone', 'chat-private-zone', 'chat-group-zone', 'admin-spy-zone'];
    zones.forEach(z => {
        const el = document.getElementById(z);
        if (el) el.classList.add('hidden');
    });

    // 3. Xử lý hiển thị từng Tab
    if (type === 'global') {
        const gZone = document.getElementById('chat-global-zone');
        if (gZone) {
            gZone.classList.remove('hidden');
            window.loadGlobalChat(); // Tải tin nhắn chung
        }
    } 
    else if (type === 'private') {
        const pZone = document.getElementById('chat-private-zone');
        if (pZone) {
            pZone.classList.remove('hidden');
            const hasConvo = !!window.currentPrivateConvo;
            
            // Nếu Boss ĐANG nhắn tin (Spying hoặc nhắn thật) thì hiện khung chat, không thì hiện danh sách
            const sView = document.getElementById('private-search-view');
            const cArea = document.getElementById('private-chat-area');
            if (sView && cArea) {
                sView.classList[hasConvo ? 'add' : 'remove']('hidden');
                cArea.classList[hasConvo ? 'remove' : 'add']('hidden');
            }

            // Nếu là Admin và KHÔNG nhắn tin dở, hiện vùng giám sát
            if (window.isBoss() && !hasConvo) {
                const spy = document.getElementById('admin-spy-zone');
                if (spy) spy.classList.remove('hidden');
                if (sView) sView.classList.add('hidden'); // Admin dùng Spy thay cho danh sách thường
            } else {
                window.renderRecentChats();
            }
        }
    } 
    else if (type === 'group') {
        const grpZone = document.getElementById('chat-group-zone');
        if (grpZone) {
            grpZone.classList.remove('hidden');
            const hasGrp = !!window.currentGroupChat;
            
            const gListView = document.getElementById('group-list-view');
            const gChatArea = document.getElementById('group-chat-area');
            
            if (gListView && gChatArea) {
                // Nếu đang trong nhóm thì hiện khung chat
                gListView.classList[hasGrp ? 'add' : 'remove']('hidden');
                gChatArea.classList[hasGrp ? 'remove' : 'add']('hidden');
            }

            // QUAN TRỌNG: Admin vẫn cần load danh sách nhóm để Quản lý
            if (!hasGrp) {
                window.loadGroups(); 
                // Chỉ hiện Spy zone nếu Boss muốn (có thể để hiện song song hoặc ẩn tùy ý)
                // Ở đây mình cho hiện danh sách Nhóm trước để Boss còn bấm "Tạo nhóm mới"
            }
        }
    }
};

// TẢI DỮ LIỆU CHAT CHUNG
window.loadGlobalChat = () => {
    const box = document.getElementById('global-chat-box');
    const ind = document.getElementById('global-typing-indicator');
    if (window.currentChatRef) window.currentChatRef.off();
    if (window.typingRef) window.typingRef.off(); 
    if (box) box.innerHTML = ''; 

    const villageId = 'global_' + window.currentVillage; 
    const dbPath = 'chat/' + villageId;
    window.currentChatRef = window.db.ref(dbPath).limitToLast(30);

    // Xử lý khi có tin nhắn mới
    window.currentChatRef.on('child_added', snap => {
        const m = snap.val();
        // 🕵️ Bỏ qua thông báo & không xử lý gì cho tin từ admin nếu người xem không phải admin
        const _hideAdmin = window.session && !window.isBoss() && m && (m.id === 'admin' || (window.allUsersMapFull && window.allUsersMapFull[m.id] && window.allUsersMapFull[m.id].role === 'admin'));
        if (_hideAdmin) return;
        if (m.id !== window.session.id && typeof window.pushNoti === 'function') {
            window.pushNoti("💬 Làng: " + m.name, m.text);
        }
        const isAtBottom = box ? (box.scrollHeight - box.scrollTop - box.clientHeight) < 50 : false;
        if(box) box.insertAdjacentHTML('beforeend', window.renderMessage(m, window.session && m.id === window.session.id, snap.key, villageId, 'global'));
        if(box && (isAtBottom || m.id === window.session.id)) box.scrollTop = box.scrollHeight;
    });

    // BẢN VÁ: Cập nhật ngay lập tức khi thả biểu cảm
    window.currentChatRef.on('child_changed', snap => {
        const m = snap.val();
        const msgEl = document.getElementById(`msg-${snap.key}`);
        if (msgEl) {
            msgEl.outerHTML = window.renderMessage(m, window.session && m.id === window.session.id, snap.key, villageId, 'global');
        }
    });

    window.typingRef = window.db.ref(`typing/${villageId}/global`);
    window.typingRef.on('value', snap => {
        let t = [];
        snap.forEach(c => { if(window.session && c.key !== window.session.id) t.push(c.val()); });
        if(ind) {
            if(t.length > 0) { ind.innerText = `${t.join(', ')} đang gõ...`; ind.classList.remove('hidden'); } 
            else ind.classList.add('hidden');
        }
    });
};


window.sendGlobalChat = () => {
    const input = document.getElementById('global-chat-input');
    const txt = input.value.trim();
    if (!txt || !window.session) return;
    window.db.ref('chat/global_' + window.currentVillage).push({
        id: window.session.id,
        name: window.session.name,
        text: txt,
        time: firebase.database.ServerValue.TIMESTAMP
    });
    input.value = '';
    window.db.ref(`typing/global_${window.currentVillage}/global/${window.session.id}`).remove();
};
// BỔ SUNG VÀO PHẦN 9 TRONG script.js

window.sendPrivateChat = () => {
    const input = document.getElementById('private-chat-input');
    const txt = input.value.trim();
    
    if (!txt || !window.session || !window.currentPrivateConvo) return;

    const payload = {
        id: window.session.id,
        name: window.session.name,
        text: txt,
        time: firebase.database.ServerValue.TIMESTAMP
    };

    window.db.ref('chat/private/' + window.currentPrivateConvo).push(payload).then(() => {
        // VÁ LỖI: Dùng thuật toán tách mảng để lấy ID người nhận chuẩn xác
        const ids = window.currentPrivateConvo.split('_');
        const targetId = ids[0] === window.session.id ? ids[1] : ids[0];
        
        window.db.ref('unread/' + targetId + '/' + window.session.id).set(true);
        
        input.value = ''; 
        window.db.ref(`typing/private/${window.currentPrivateConvo}/${window.session.id}`).remove();
    });
};

window.sendGroupChat = () => {
    const input = document.getElementById('group-chat-input');
    const txt = input.value.trim();
    
    if (!txt || !window.session || !window.currentGroupChat) return;

    window.db.ref('chat/group/' + window.currentGroupChat).push({
        id: window.session.id,
        name: window.session.name,
        text: txt,
        time: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        input.value = '';
        window.db.ref(`typing/group/${window.currentGroupChat}/${window.session.id}`).remove();
    });
};
// XỬ LÝ ẢNH TRONG CHAT
window.triggerChatImage = (type) => { 
    window.currentUploadType = type; 
    document.getElementById('chat-img-file').click(); 
};

window.uploadChatImage = async () => {
    const f = document.getElementById('chat-img-file').files[0];
    if(!f) return;
    window.showCustomAlert("⏳ Đang gửi ảnh...");
    const url = await window.uploadToImgBB(f);
    if(url) {
        const msgText = `[IMG]${url}[/IMG]`;
        const payload = { id: window.session.id, name: window.session.name, text: msgText, time: firebase.database.ServerValue.TIMESTAMP };
        
        if(window.currentUploadType === 'global') window.db.ref('chat/global_' + window.currentVillage).push(payload);
        else if (window.currentUploadType === 'private') {
            window.db.ref('chat/private/' + window.currentPrivateConvo).push(payload);
            const targetId = window.currentPrivateConvo.replace(window.session.id, '').replace('_', '');
            window.db.ref('unread/' + targetId + '/' + window.session.id).set(true);
        }
        else if (window.currentUploadType === 'group') window.db.ref('chat/group/' + window.currentGroupChat).push(payload);
    } else {
        window.showCustomAlert("❌ Gửi ảnh thất bại! Vui lòng kiểm tra lại kết nối hoặc dung lượng file.");
    }
    document.getElementById('chat-img-file').value = '';
};

window.unsendMsg = (type, convoId, msgKey) => {
    // 1. Gọi giao diện xác nhận Xịn xò thay cho confirm()
    window.showCustomConfirm("THU HỒI TIN NHẮN", "Tin nhắn này sẽ bị thu hồi với mọi người. Bạn có chắc không?", () => {
        
        // Kiểm tra an toàn: Chưa đăng nhập thì cút
        if (!window.session || !window.session.id) {
            return window.showCustomAlert("LỖI", "Bạn chưa đăng nhập!", "❌");
        }

        let refPath = type.startsWith('global') ? `chat/${type}/${msgKey}` : `chat/${type}/${convoId}/${msgKey}`;
        
        // 2. Nâng cấp cốt lõi: Tải tin nhắn về để check xem ai là chủ trước khi cho phép xóa
        window.db.ref(refPath).once('value').then(snap => {
            const msgData = snap.val();
            
            if (!msgData) {
                return window.showCustomAlert("LỖI", "Tin nhắn không tồn tại hoặc đã bị xóa!", "⚠️");
            }

            // CHỐNG HACK: Chỉ cho phép người gửi hoặc Admin được quyền thu hồi
            if (msgData.id === window.session.id || window.isAdminLevel()) {
                
                // Nếu đúng chủ nhân -> Xóa!
                window.db.ref(refPath).update({ text: '[UNSENT]' }).catch(err => {
                    window.showCustomAlert("LỖI", "Không thể thu hồi: " + err.message, "❌");
                });

            } else {
                // Nếu sai chủ nhân (cố tình dùng F12) -> Bắt quả tang
                window.showCustomAlert("CẢNH BÁO", "Chơi bẩn à? Bạn không có quyền thu hồi tin nhắn của người khác đâu!", "🚨");
            }
        });
    });
};


window.onChatInput = (type) => {
    if (!window.session || !window.db) return;
    // SỬA LỖI LOGIC ẨN: Với chat chung, trước đây ghi vào 'typing/global/global/...'
    // trong khi loadGlobalChat lắng nghe tại 'typing/global_<làng>/global'
    // => chỉ báo "đang gõ..." của Chat Chung không bao giờ hiển thị.
    let typingPath;
    if (type === 'global') {
        typingPath = `typing/global_${window.currentVillage}/global/${window.session.id}`;
    } else {
        const cId = (type === 'private') ? window.currentPrivateConvo : window.currentGroupChat;
        if (!cId) return;
        typingPath = `typing/${type}/${cId}/${window.session.id}`;
    }
    window.db.ref(typingPath).set(window.session.name);
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => window.db.ref(typingPath).remove(), 2000);
};
// ==========================================
// PHẦN 10: TIN NHẮN GẦN ĐÂY, NHÓM & ĐỌC LÉN
// ==========================================

// NÂNG CẤP: Danh sách gần đây gộp cả Cá nhân & Nhóm (Real-time)
window.renderRecentChats = () => {
    if(!window.session || !window.allUsersMap) return;
    const rList = document.getElementById('recent-chat-list');
    const onlineZone = document.getElementById('tt-online-zone');
    if(!rList) return;

    // 1. Chèn Skeleton lúc chờ dữ liệu Firebase
    rList.innerHTML = `
        <div class="skeleton-box" style="height: 70px; width: 100%; margin-bottom: 5px; border-radius: 10px;"></div>
        <div class="skeleton-box" style="height: 70px; width: 100%; margin-bottom: 5px; border-radius: 10px;"></div>
        <div class="skeleton-box" style="height: 70px; width: 100%; margin-bottom: 5px; border-radius: 10px;"></div>
    `;

    // 2. Kéo dữ liệu bạn bè & hiển thị danh sách
    window.db.ref('friends/' + window.session.id).once('value', snap => {
        let html = '';
        const friends = snap.val() || {};
        
        // 🕵️ ẨN ADMIN: không tự thêm 'admin' vào danh bạ của học sinh/giáo viên nữa.
        // Nếu vì lịch sử cũ mà vẫn còn friends['admin'], loại bỏ để không lộ sự tồn tại.
        if (!window.isBoss() && friends['admin']) {
            delete friends['admin'];
        }

        for (let uid in friends) {
            if (friends[uid] === 'accepted') {
                const u = window.allUsersMap[uid];
                // 🕵️ Không có trong allUsersMap (bao gồm mọi tài khoản admin đã bị lọc) => bỏ qua.
                if (!u) continue;
                const targetUser = u;
                
                // Lấy biệt danh nếu có
                const dName = window.myNicknames?.[uid] || targetUser.name;
                const avt = targetUser.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                const hasUnread = window.unreadData && window.unreadData[uid] ? '<span class="tt-badge anim-pulse">Mới</span>' : '';
                
                html += `<button class="tt-item" onclick="window.openDirectChat('${uid}')">
                    <div class="tt-avt-wrap"><img src="${avt}" class="tt-avt"></div>
                    <div class="tt-info">
                        <div class="tt-name">${window.escapeHTML(dName)}</div>
                        <span class="tt-preview">ID: ${uid.toUpperCase()}</span>
                    </div>
                    <div class="tt-action">${hasUnread || '<i class="fa-solid fa-chevron-right"></i>'}</div>
                </button>`;
            }
        }
        
        rList.innerHTML = html || '<p style="text-align:center; color:#888; font-size:13px; margin-top:20px;">Chưa có ai trong danh bạ.</p>';
    });
};

// Tìm hàm openDirectChat trong script.js và thêm dòng switchTab
window.openDirectChat = (uid) => {
    // 🕵️ ẨN ADMIN: không cho phép non-admin mở chat trực tiếp với tài khoản admin.
    if (uid === 'admin' && window.session?.role !== 'admin') {
        return window.showCustomAlert && window.showCustomAlert("KHÔNG TÌM THẤY", "Người dùng không tồn tại.", "❓");
    }
    // Tự động chuyển sang tab chat trước khi mở cuộc hội thoại
    window.switchTab('chat'); 
    
    window.db.ref('users/'+uid).once('value').then(s => {
        const u = s.val();
        if (!u || (u.role === 'admin' && window.session?.role !== 'admin')) {
            return window.showCustomAlert && window.showCustomAlert("KHÔNG TÌM THẤY", "Người dùng không tồn tại.", "❓");
        }
        const tName = u.name;
        
        // Đảm bảo tab "RIÊNG" được chọn
        window.openChatChannel('private');
        window.checkAndStartPrivateChat(uid, tName, u.allowPrivate !== false);
    });
};
window.checkAndStartPrivateChat = (targetId, targetName, allowPrivate) => {
    if (!allowPrivate && !window.isAdminLevel()) return window.showCustomAlert("🔕 Người này đã tắt nhận tin nhắn riêng!");
    
    document.getElementById('private-search-view').classList.add('hidden');
    document.getElementById('private-chat-area').classList.remove('hidden');
    document.getElementById('private-chat-input-zone').classList.remove('hidden');
    
    const dName = (window.myNicknames && window.myNicknames[targetId]) || targetName;
    document.getElementById('private-chat-title').innerHTML = `💬 ${dName} <span onclick="window.setNickname('${targetId}', '${dName}')" style="font-size:12px; cursor:pointer; color:var(--text-light); margin-left:5px;">✏️</span>`;
    
    if(typeof window.getConvoId === 'function') {
        window.currentPrivateConvo = window.getConvoId(window.session.id, targetId);
    } else {
        window.currentPrivateConvo = [window.session.id, targetId].sort().join('_');
    }
    
    window.db.ref('unread/' + window.session.id + '/' + targetId).remove();
    window.db.ref('chat_streaks/' + window.currentPrivateConvo).set(true);

    const box = document.getElementById('private-chat-box');
    if(box) box.innerHTML = '<div style="text-align:center;color:#888;margin-top:20px;">Hãy gửi lời chào! 👋</div>';

    if (window.currentChatRef) window.currentChatRef.off();
    window.currentChatRef = window.db.ref('chat/private/' + window.currentPrivateConvo).limitToLast(30);
    
    let isFirstLoad = true;
    
    window.currentChatRef.on('child_added', snap => {
        if (isFirstLoad && box) { box.innerHTML = ''; isFirstLoad = false; }
        const m = snap.val();
        const isAtBottom = box ? (box.scrollHeight - box.scrollTop - box.clientHeight) < 50 : false;
        if(box) box.insertAdjacentHTML('beforeend', window.renderMessage(m, m.id === window.session.id, snap.key, 'private', window.currentPrivateConvo));
        if(box && (isAtBottom || m.id === window.session.id)) box.scrollTop = box.scrollHeight;
    });

    window.currentChatRef.on('child_changed', snap => {
        const m = snap.val();
        const msgEl = document.getElementById(`msg-${snap.key}`);
        if (msgEl) {
            msgEl.outerHTML = window.renderMessage(m, m.id === window.session.id, snap.key, 'private', window.currentPrivateConvo);
        }
    });
};


window.closePrivateChat = () => {
    document.getElementById('private-chat-area').classList.add('hidden');
    document.getElementById('private-search-view').classList.remove('hidden');
    const spyZone = document.getElementById('admin-spy-zone');
    if(spyZone) spyZone.classList.add('hidden');
    if (window.currentChatRef) window.currentChatRef.off();
    window.currentPrivateConvo = "";
    window.isSpying = false;
};

// QUẢN LÝ NHÓM CHAT
window.loadGroups = () => {
    if(!window.session) return;
    if (window._groupsRef) { try { window._groupsRef.off(); } catch(e){} }
    window._groupsRef = window.db.ref('groups');
    window._groupsRef.on('value', snap => {
        let html = '';
        snap.forEach(child => {
            const grp = child.val();
            // CHỈ hiển thị ở khung Chat nếu thực sự là thành viên. Đọc lén thì Boss ra khu vực Giám sát.
            if (grp.members && grp.members[window.session.id]) {
                const avtHtml = grp.avatar ? `<img src="${grp.avatar}" class="tt-avt">` : `<div class="tt-avt" style="background:#ff0050; color:white; display:flex; justify-content:center; align-items:center;">👥</div>`;
                // VÁ XSS: escape name/admin
                const safeName = window.escapeHTML(String(grp.name || ''));
                const safeAdmin = window.escapeHTML(String(grp.admin || '').toUpperCase());
                const safeKey = String(child.key).replace(/'/g, "\\'");
                const safeAdminAttr = String(grp.admin || '').replace(/'/g, "\\'");
                const safeNameAttr = String(grp.name || '').replace(/'/g, "\\'");
                html += `<button class="tt-item" onclick="window.openGroupChat('${safeKey}', '${safeNameAttr}', '${safeAdminAttr}')">
                    <div class="tt-avt-wrap">${avtHtml}</div>
                    <div class="tt-info"><div class="tt-name">${safeName}</div><span class="tt-preview">Trưởng nhóm: ${safeAdmin}</span></div>
                </button>`;
            }
        });
        const groupList = document.getElementById('my-groups-list');
        if(groupList) groupList.innerHTML = html || '<p style="text-align:center; color:#888; margin-top:20px;">Bạn chưa tham gia nhóm nào.</p>';
    });
};
window.openGroupChat = (grpId, grpName, adminId) => {
    document.getElementById('group-list-view').classList.add('hidden');
    document.getElementById('group-chat-area').classList.remove('hidden');
    document.getElementById('group-chat-input-zone').classList.remove('hidden');
    document.getElementById('group-chat-title').innerText = "👥 " + grpName;
    window.currentGroupChat = grpId;
    window.currentGroupAdmin = adminId;

    const box = document.getElementById('group-chat-box');
    if(box) box.innerHTML = '<div style="text-align:center;color:#888;margin-top:20px;">Nhóm mới tạo, hãy bắt đầu trò chuyện!</div>';

    if (window.currentChatRef) window.currentChatRef.off();
    window.currentChatRef = window.db.ref('chat/group/' + grpId).limitToLast(30);
    
    let isFirstLoad = true;

    window.currentChatRef.on('child_added', snap => {
        if (isFirstLoad && box) { box.innerHTML = ''; isFirstLoad = false; }
        const m = snap.val();
        const isAtBottom = box ? (box.scrollHeight - box.scrollTop - box.clientHeight) < 50 : false;
        if(box) box.insertAdjacentHTML('beforeend', window.renderMessage(m, m.id === window.session.id, snap.key, 'group', grpId));
        if(box && (isAtBottom || m.id === window.session.id)) box.scrollTop = box.scrollHeight;
    });

    window.currentChatRef.on('child_changed', snap => {
        const m = snap.val();
        const msgEl = document.getElementById(`msg-${snap.key}`);
        if (msgEl) {
            msgEl.outerHTML = window.renderMessage(m, m.id === window.session.id, snap.key, 'group', grpId);
        }
    });
};


window.closeGroupChat = () => {
    document.getElementById('group-chat-area').classList.add('hidden');
    document.getElementById('group-list-view').classList.remove('hidden');
    const spyZone = document.getElementById('admin-spy-zone');
    if(spyZone) spyZone.classList.add('hidden');
    if (window.currentChatRef) window.currentChatRef.off();
    window.currentGroupChat = "";
    window.isSpying = false;
};

// TÍNH NĂNG ĐỌC LÉN (ADMIN SPY)
window.loadAdminSpy = () => {
    if (!window.session || !window.isAdminLevel()) return;
    window.db.ref('chat_streaks').on('value', snap => {
        let html = '';
        snap.forEach(child => {
            const convoId = child.key;
            if(convoId.includes('_')) {
                const ids = convoId.split('_');
                const n1 = window.allUsersMap?.[ids[0]]?.name || ids[0];
                const n2 = window.allUsersMap?.[ids[1]]?.name || ids[1];
                html += `<div class="spy-convo-item card shadow-lux" style="padding:15px; cursor:pointer; margin-bottom:10px; border-left:4px solid #dc3545;" onclick="window.spyPrivateChat('${ids[0]}', '${ids[1]}')">
                    <div style="font-weight:bold; color:var(--pink);">${n1} 💬 ${n2}</div>
                    <div style="font-size:11px; color:#888;">ID: ${ids[0]} & ${ids[1]}</div>
                </div>`;
            } else if (convoId.startsWith('grp_')) {
                html += `<div class="spy-convo-item card shadow-lux" style="padding:15px; cursor:pointer; margin-bottom:10px; border-left:4px solid #9C27B0;" onclick="window.spyGroupChat('${convoId}')">
                    <div style="font-weight:bold; color:#9C27B0;">👥 NHÓM: ${convoId}</div>
                </div>`;
            }
        });
        const list = document.getElementById('admin-convo-list');
        if(list) list.innerHTML = html || '<p style="text-align:center;color:#888;">Chưa có dữ liệu hội thoại.</p>';
    });
};

window.spyPrivateChat = (id1, id2) => {
    let convoId = '';
    if(typeof window.getConvoId === 'function') convoId = window.getConvoId(id1, id2);
    else convoId = [id1, id2].sort().join('_');
    
    window.isSpying = true;
    document.getElementById('admin-spy-zone').classList.add('hidden');
    document.getElementById('private-chat-area').classList.remove('hidden');
    document.getElementById('private-chat-input-zone').classList.add('hidden'); 
    document.getElementById('private-chat-title').innerText = "🕵️ Đọc lén: " + id1.toUpperCase() + " & " + id2.toUpperCase();
    
    if (window.currentChatRef) window.currentChatRef.off();
    window.currentChatRef = window.db.ref('chat/private/' + convoId);
    window.currentChatRef.on('value', snap => {
        let html = '';
        snap.forEach(child => {
            const m = child.val();
            html += window.renderMessage(m, m.id === id1, child.key, 'private', convoId);
        });
        const box = document.getElementById('private-chat-box');
        if(box) {
            box.innerHTML = html || '<div style="text-align:center;color:#888;margin-top:20px;">Trống!</div>';
            setTimeout(() => { box.scrollTop = box.scrollHeight; }, 100);
        }
    });
};

window.spyGroupChat = (grpId) => {
    window.isSpying = true;
    document.getElementById('admin-spy-zone').classList.add('hidden');
    document.getElementById('group-chat-area').classList.remove('hidden');
    document.getElementById('group-chat-input-zone').classList.add('hidden');
    document.getElementById('group-chat-title').innerText = "🕵️ Đọc lén nhóm: " + grpId;

    if (window.currentChatRef) window.currentChatRef.off();
    window.currentChatRef = window.db.ref('chat/group/' + grpId);
    window.currentChatRef.on('value', snap => {
        let html = '';
        snap.forEach(child => {
            const m = child.val();
            html += window.renderMessage(m, false, child.key, 'group', grpId);
        });
        const box = document.getElementById('group-chat-box');
        if(box) {
            box.innerHTML = html || '<div style="text-align:center;color:#888;margin-top:20px;">Trống!</div>';
            setTimeout(() => { box.scrollTop = box.scrollHeight; }, 100);
        }
    });
};
// ==========================================
// PHẦN 11: QUẢN LÝ NHÓM & BẢO TRÌ HỆ THỐNG
// ==========================================

// 1. HÀM QUẢN LÝ NHÓM (Đã cập nhật tự động thêm nút Giải Tán cho Boss)
window.openGroupManageModal = () => {
    if(!window.currentGroupChat) return;
    window.db.ref('groups/' + window.currentGroupChat).once('value').then(snap => {
        const grp = snap.val();
        
        // Cấp quyền cho cả Trưởng nhóm và Boss (Admin)
        const isAdmin = (window.session.id === grp.admin || window.isAdminLevel()); 
        
        const statusEl = document.getElementById('group-admin-status');
        if(statusEl) statusEl.innerText = isAdmin ? "👑 Quản trị viên (Trưởng nhóm / Boss)" : "👤 Thành viên";
        
        const addZone = document.getElementById('group-add-member-zone');
        if(addZone) addZone.classList[isAdmin ? 'remove' : 'add']('hidden');
        
        const avtZone = document.getElementById('group-avatar-zone');
        if(avtZone) avtZone.classList[isAdmin ? 'remove' : 'add']('hidden');
        
        // TỰ ĐỘNG TẠO NÚT GIẢI TÁN NẾU LÀ ADMIN (Không cần sửa HTML)
        if (isAdmin) {
            if (!document.getElementById('btn-dissolve-group')) {
                const dissolveBtn = document.createElement('button');
                dissolveBtn.id = 'btn-dissolve-group';
                dissolveBtn.className = 'btn-royal';
                dissolveBtn.style.background = '#dc3545'; // Màu đỏ cảnh báo
                dissolveBtn.style.padding = '12px';
                dissolveBtn.style.marginTop = '10px';
                dissolveBtn.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                dissolveBtn.innerHTML = '💣 GIẢI TÁN NHÓM (XÓA HẾT)';
                dissolveBtn.onclick = window.dissolveGroup;
                if(avtZone) avtZone.appendChild(dissolveBtn);
            }
        } else {
            // Nếu là thành viên thường thì xóa nút này đi (chống hack UI)
            const btn = document.getElementById('btn-dissolve-group');
            if (btn) btn.remove();
        }

        let html = '';
        for(let uid in grp.members) {
            let kickBtn = (isAdmin && uid !== grp.admin) ? `<button style="color:red; background:none; border:none; cursor:pointer;" onclick="window.kickGroupMember('${uid}')">❌ Đuổi</button>` : '';
            let roleTxt = (uid === grp.admin) ? '👑 Trưởng nhóm' : '👤 Thành viên';
            html += `<li style="padding:10px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between;">
                <span><b style="color:var(--pink);">${uid.toUpperCase()}</b> <small>(${roleTxt})</small></span> ${kickBtn}
            </li>`;
        }
        if(!isAdmin) html += `<button style="width:100%; margin-top:15px; padding:10px; background:#dc3545; color:white; border:none; border-radius:10px;" onclick="window.leaveGroup()">🚪 RỜI NHÓM</button>`;
        
        const memberList = document.getElementById('group-member-list');
        if(memberList) memberList.innerHTML = html;
        window.toggleModal('group-manage-modal', true);
    });
};

// 2. HÀM THỰC THI NÉM BOM DỮ LIỆU
window.dissolveGroup = () => {
    if (!window.currentGroupChat) return;

    window.showCustomConfirm(
        "XÁC NHẬN GIẢI TÁN", 
        "Hành động này sẽ xóa vĩnh viễn Nhóm và toàn bộ lịch sử chat. Bạn chắc chắn chứ?", 
        async () => {
            const groupId = window.currentGroupChat;
            window.showCustomAlert("⏳ Đang dọn dẹp...", "", "⏳");

            try {
                // Quét sạch 3 mảng dữ liệu cùng lúc để tối ưu tốc độ
                const deletePaths = [
                    window.db.ref('groups/' + groupId).remove(),            // Bảng dữ liệu nhóm
                    window.db.ref('chat/group/' + groupId).remove(),        // Bảng lịch sử chat
                    window.db.ref('chat_streaks/grp_' + groupId).remove()   // Bảng đọc lén của Boss
                ];

                await Promise.all(deletePaths);

                window.showCustomAlert("THÀNH CÔNG", "Nhóm đã bị giải tán sạch sẽ!", "💥");
                window.toggleModal('group-manage-modal', false);
                window.closeGroupChat(); // Tắt giao diện chat hiện tại
                
                if (typeof window.loadGroups === 'function') {
                    window.loadGroups(); // Tải lại danh sách nhóm bên ngoài
                }

            } catch (err) {
                window.showCustomAlert("LỖI HỆ THỐNG", "Không thể giải tán nhóm: " + err.message, "❌");
            }
        }
    );
};


window.copyGroupLink = () => {
    const link = location.origin + location.pathname + '?joingroup=' + window.currentGroupChat;
    // VÁ: dùng safeCopyText để có fallback cho HTTP / trình duyệt cũ
    window.safeCopyText(link, "✅ Đã copy link nhóm! Hãy gửi cho bạn bè để họ tham gia.");
};

window.addGroupMember = () => {
    const uidInput = document.getElementById('new-member-id');
    const uid = uidInput ? uidInput.value.toLowerCase().trim() : '';
    if(!uid) return;
    
    window.db.ref('users/'+uid).once('value').then(s => {
        if(!s.exists()) return window.showCustomAlert("❌ ID không tồn tại trên hệ thống!");
        window.db.ref(`groups/${window.currentGroupChat}/members/${uid}`).set(true).then(() => {
            window.showCustomAlert("✅ Đã thêm người này vào nhóm!");
            if(uidInput) uidInput.value = '';
            window.openGroupManageModal();
        });
    });
};

window.leaveGroup = () => {
    // VÁ LỖI: Chặn trưởng nhóm rời đi
    if (window.currentGroupAdmin === window.session.id) {
        if(typeof window.showCustomAlert === 'function') {
            return window.showCustomAlert("KHÔNG THỂ RỜI ĐI", "Bạn là Trưởng nhóm! Không thể bỏ mặc anh em. Đề nghị không tự ý rời nhóm.", "⚠️");
        } else {
            return alert("Bạn là Trưởng nhóm, không thể rời đi!");
        }
    }

    window.showCustomConfirm("RỜI NHÓM", "🚪 Bạn có chắc muốn rời khỏi nhóm này?", () => {
        window.db.ref(`groups/${window.currentGroupChat}/members/${window.session.id}`).remove().then(() => {
            if(typeof window.showCustomAlert === 'function') {
                window.showCustomAlert("THÀNH CÔNG", "Đã rời nhóm thành công!", "✅");
            }
            window.toggleModal('group-manage-modal', false);
            if(typeof window.closeGroupChat === 'function') window.closeGroupChat();
            if(typeof window.loadGroups === 'function') window.loadGroups();
        });
    });
};
 

window.kickGroupMember = (uid) => {
    window.showCustomConfirm("XÓA THÀNH VIÊN", "❌ Bạn có chắc muốn xóa người này khỏi nhóm?", () => {
        window.db.ref(`groups/${window.currentGroupChat}/members/${uid}`).remove().then(() => {
            window.openGroupManageModal();
        });
    });
};

// CHỨC NĂNG BẢO TRÌ HỆ THỐNG
window.updateMaintenanceUI = () => {
    const mScreen = document.getElementById('maintenance-screen');
    if (!mScreen) return;
    
    // Nếu đang bảo trì, và chưa vượt rào thành công, thì hiện màn hình bảo trì
    if (window.isMaintenance && !window.maintenanceBypass) {
        mScreen.classList.remove('hidden');
    } else {
        mScreen.classList.add('hidden');
    }
};

window.revealMaintenancePin = () => { 
    const pinZone = document.getElementById('maintenance-pin-zone');
    if(pinZone) pinZone.classList.toggle('hidden'); 
};

window.verifyMaintenancePin = () => {
    const pinInput = document.getElementById('maintenance-pin-input');
    const pin = pinInput ? pinInput.value : '';
    
    // Gọi trực tiếp lên Firebase để kiểm tra, không lưu trữ ở Client
    window.db.ref('config/clearPin').once('value').then(snap => {
        const realPin = snap.val() || "654321"; // Lấy PIN từ server
        if (pin === realPin) {
            window.maintenanceBypass = true;
            window.updateMaintenanceUI();
            window.showCustomAlert('CHẾ ĐỘ BOSS', 'Đã mở khóa lối vào thành công!', '🔓');
        } else {
            window.showCustomAlert('TRUY CẬP BỊ CHẶN', 'Sai mã PIN! Vui lòng thử lại.', '❌');
        }
    }).catch(err => {
        window.showCustomAlert('LỖI KẾT NỐI', 'Không thể xác thực với máy chủ!', '🚨');
    });
};


// CÔNG CỤ TẢI ẢNH LÊN IMGBB
window.uploadToImgBB = async (file) => {
    // VÁ: validate loại file & dung lượng trước khi gửi (tiết kiệm băng thông, chặn lạm dụng)
    if (!file) { window.showCustomAlert('THIẾU FILE', 'Chưa chọn ảnh để tải lên.', '⚠️'); return null; }
    if (!file.type || !file.type.startsWith('image/')) {
        window.showCustomAlert('SAI ĐỊNH DẠNG', 'Chỉ hỗ trợ file ảnh (jpg, png, gif, webp).', '⚠️');
        return null;
    }
    const MAX_MB = 8;
    if (file.size > MAX_MB * 1024 * 1024) {
        window.showCustomAlert('ẢNH QUÁ NẶNG', 'Kích thước tối đa là ' + MAX_MB + 'MB. Vui lòng chọn ảnh nhỏ hơn.', '⚠️');
        return null;
    }
    const formData = new FormData();
    formData.append('image', file);
    try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${window.IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const json = await res.json();
        return json.success ? json.data.url : null;
    } catch (e) {
        console.error("Lỗi ImgBB:", e);
        return null;
    }
};

// ADMIN CẤP ẢNH ĐẠI DIỆN CHO HỌC SINH
window.grantAvatar = async () => {
    const targetIdInput = document.getElementById('avatar-target-id');
    const targetId = targetIdInput ? targetIdInput.value.trim().toLowerCase() : '';
    
    if (!targetId || !window.tempGrantFile) return window.showCustomAlert("⚠️ Thiếu ID hoặc chưa chọn ảnh!");

    // BƯỚC 1: Kiểm tra xem ID này có thực sự tồn tại không
    window.db.ref('users/' + targetId).once('value').then(async (snap) => {
        if (!snap.exists()) {
            return window.showCustomAlert("❌ LỖI: ID '" + targetId + "' không tồn tại. Không thể cấp ảnh!");
        }

        window.showCustomAlert("⏳ Đang đồng bộ ảnh lên hệ thống...");
        const url = await window.uploadToImgBB(window.tempGrantFile);
        
        if (url) {
            // BƯỚC 2: Cập nhật ảnh vào đúng tài khoản
            window.db.ref('users/' + targetId).update({ avatar: url }).then(() => {
                window.showCustomAlert("✅ Đã cấp ảnh thành công cho " + snap.val().name + "!");
                document.getElementById('grant-preview-img').classList.add('hidden');
                targetIdInput.value = '';
                window.tempGrantFile = null;
            });
        } else {
            window.showCustomAlert("❌ Lỗi tải ảnh lên ImgBB!");
        }
    });
};

// ==========================================
// PHẦN 12: QUẢN LÝ NGƯỜI DÙNG, THEO DÕI & KHỞI CHẠY
// ==========================================

// 1. TẢI VÀ QUẢN LÝ DANH SÁCH TÀI KHOẢN
window.loadUsers = () => {
    if (!window.db) return;
    // VÁ RÒ RỈ LISTENER: detach listener cũ trước khi gắn mới
    if (window._usersRef) { try { window._usersRef.off(); } catch(e){} }
    if (window._userPassRef) { try { window._userPassRef.off(); } catch(e){} }
    window._usersRef = window.db.ref('users');
    window._usersRef.on('value', s => {
        const dRaw = s.val() || {}; 
        // 🕵️ ẨN ADMIN: học sinh & giáo viên KHÔNG bao giờ nhìn thấy tài khoản admin trong bất kỳ danh sách nào.
        // Admin vẫn giữ toàn bộ quyền quan sát vì với session.role==='admin' ta trả về map đầy đủ.
        let d;
        if (window.session && window.isBoss()) {
            d = dRaw;
        } else {
            d = {};
            for (const _uid in dRaw) {
                if (_uid === 'admin') continue;
                if (dRaw[_uid] && dRaw[_uid].role === 'admin') continue;
                d[_uid] = dRaw[_uid];
            }
        }
        window.allUsersMap = d; 
        window.allUsersMapFull = dRaw; // admin dùng khi cần dữ liệu gốc
        
        const renderTable = (pMap) => {
            let h = '', g = '', spyOptions = '<option value="">-- Chọn tài khoản --</option>'; 
            for (let i in d) {
                if (i === 'admin') continue; 
                const u = d[i];
                const passDisplay = (pMap[i] && (window.isAdminLevel() || (window.session.role === 'gv' && u.role === 'hs'))) ? pMap[i].pass : '***';
                const lockBadge = u.isLocked ? '<span style="background:#FF9800;color:white;font-size:10px;padding:2px 5px;border-radius:5px;margin-left:5px;">ĐÃ KHÓA</span>' : '';
                const avt = u.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                
                const rw = `<tr onclick="window.openUserActionMenu('${i}','${window.escapeHTML(u.name)}','${passDisplay}',${u.isLocked || false}, '${u.role}')" style="cursor:pointer;">
                    <td style="text-align:left; display:flex; align-items:center; gap:10px;">
                        <img src="${avt}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid var(--border);">
                        <div><b style="color:var(--pink);">${window.escapeHTML(u.name)}</b> ${lockBadge}<br><small style="color:var(--text-light); font-weight:bold;">ID: ${i.toUpperCase()}</small></div>
                    </td>
                    <td>${passDisplay}</td>
                    <td style="text-align:right;"><i class="fas fa-ellipsis-v" style="color:var(--pink); padding:10px;"></i></td>
                </tr>`;
                
                if (u.role === 'gv' || u.role === 'ql') g += rw; else h += rw; 
                spyOptions += `<option value="${i}">${window.escapeHTML(u.name)} (${i})</option>`;
            }
            const gvList = document.getElementById('list-gv');
            const hsList = document.getElementById('list-hs');
            if(gvList) gvList.innerHTML = g || '<tr><td colspan="3" style="text-align:center;">Chưa có giáo viên</td></tr>'; 
            if(hsList) hsList.innerHTML = h || '<tr><td colspan="3" style="text-align:center;">Chưa có học sinh</td></tr>';
        };
        
        if (window.session && (window.isAdminLevel() || window.session.role === 'gv')) { 
            window._userPassRef = window.db.ref('user_passwords'); window._userPassRef.on('value', pSnap => { renderTable(pSnap.val() || {}); }); 
        } else { 
            renderTable({}); 
        }
    }); 
}; 

// CÁC HÀM THAO TÁC TÀI KHOẢN (TẠO, SỬA, XÓA, KHÓA)
window.createNewUser = () => {
    const id = document.getElementById('new-id').value.toLowerCase().trim(); 
    const n = document.getElementById('new-name').value.trim(); 
    const p = document.getElementById('new-pass').value.trim(); 
    let r = document.getElementById('new-role').value;

    if (window.session && window.session.role === 'gv') r = 'hs'; 
    if (!id || !n || !p) return window.showCustomAlert("Điền đủ thông tin!");
    if (p.length < 6) return window.showCustomAlert("Mật khẩu phải từ 6 ký tự!");
    
    window.db.ref('users/' + id).once('value').then(snap => {
        if (snap.exists()) { 
            window.showCustomAlert("❌ LỖI: ID '" + id + "' đã có người sử dụng!"); 
        } else {
            const app2 = firebase.apps.length > 1 ? firebase.app('App2') : firebase.initializeApp(firebase.app().options, 'App2');
            app2.auth().createUserWithEmailAndPassword(id + '@kimminlai.com', p).then(() => {
                app2.auth().signOut(); 
                window.db.ref('users/' + id).set({ name: n, role: r, isLocked: false, allowPrivate: true }).then(() => { 
                    window.db.ref('user_passwords/' + id).set({ pass: p });
                    if(typeof window.showCustomAlert === 'function') window.showCustomAlert('THÀNH CÔNG', 'Đã tạo tài khoản ' + n + '!', '✅'); 
                    else window.showCustomAlert("Tạo thành công!");
                    document.getElementById('new-id').value = ''; document.getElementById('new-name').value = ''; document.getElementById('new-pass').value = ''; 
                });
            }).catch(e => window.showCustomAlert("❌ Lỗi: " + e.message));
        }
    });
};

window.searchStudent = () => { 
    const filter = document.getElementById('search-user').value.toLowerCase(); 
    const rows = document.querySelectorAll('#list-hs tr, #list-gv tr'); 
    rows.forEach(row => { row.style.display = row.innerText.toLowerCase().includes(filter) ? '' : 'none'; }); 
};

// CẬP NHẬT PHÂN QUYỀN: GV KHÓA/SỬA ĐƯỢC HS - KHÔNG ĐƯỢC XÓA - KHÔNG ĐỤNG ĐỒNG NGHIỆP
// CẬP NHẬT PHÂN QUYỀN VÀ NÂNG CẤP GIAO DIỆN MENU (BẢN BỌC THÉP CHỐNG LỖI)
window.openUserActionMenu = (id, name, pass, isLocked, targetRole) => {
    // 1. CHỐT CHẶN BẢO MẬT: Khách không mời hoặc Học sinh thì cấm tiệt
    if (!window.session || window.session.role === 'hs') {
        return window.showCustomAlert('LỖI QUYỀN', 'Bạn không có quyền mở menu này!', '🚫');
    }

    const isGv = window.session.role === 'gv';
    const isAdmin = window.isAdminLevel();
    const isTargetQl = (targetRole === 'ql');
    
    // 2. LOGIC THÔNG MINH HƠN: GV không đụng Admin, không đụng GV khác
    const isTargetBoss = (id === 'admin' || targetRole === 'admin');
    const isTargetGv = (targetRole === 'gv');

    if (!window.isBoss() && isTargetBoss) {
        return window.showCustomAlert('LỖI QUYỀN', 'Không thể thao tác với tài khoản này!', '🚫');
    }
    if (isGv && (isTargetBoss || isTargetGv || isTargetQl)) { 
        return window.showCustomAlert('🚫 BỊ CHẶN', 'Bạn không có quyền can thiệp đồng nghiệp hoặc Boss!', '⚠️'); 
    }

    // 3. TÌM PHẦN TỬ HTML (Và chống lỗi màn hình đỏ)
    const nameEl = document.getElementById('action-u-name');
    const editBtn = document.getElementById('btn-action-edit');
    const lockBtn = document.getElementById('btn-action-lock');
    const deleteBtn = document.getElementById('btn-action-delete');

    // Nếu thiếu mã HTML, báo lỗi lịch sự thay vì treo toàn bộ hệ thống
    if (!nameEl || !editBtn || !lockBtn || !deleteBtn) {
        return window.showCustomAlert('LỖI GIAO DIỆN', 'Thiếu khung HTML của Menu. Hãy kiểm tra lại file index.html!', '🚨');
    }

    // 4. UI XỊN XÒ HƠN: Thêm nhãn (Badge) nhận diện chức vụ
    let roleBadge = '';
    if (isTargetBoss) roleBadge = '<span style="background:#FF9800; color:white; padding:2px 8px; border-radius:10px; font-size:11px; vertical-align:middle;">BOSS</span>';
    else if (isTargetGv) roleBadge = '<span style="background:#1877F2; color:white; padding:2px 8px; border-radius:10px; font-size:11px; vertical-align:middle;">GIÁO VIÊN</span>';
    else roleBadge = '<span style="background:#4CAF50; color:white; padding:2px 8px; border-radius:10px; font-size:11px; vertical-align:middle;">HỌC SINH</span>';

    nameEl.innerHTML = `${roleBadge} ${name} <br><small style="color:var(--text-light); font-size:12px; margin-top:5px; display:inline-block;">(ID: ${id.toUpperCase()})</small>`;
    
    // 5. NÚT SỬA:
    editBtn.style.display = 'block';
    editBtn.onclick = () => { 
        window.toggleModal('user-action-modal', false); 
        if(typeof window.openEditUser === 'function') window.openEditUser(id, name, pass); 
    };

    // 6. NÚT KHÓA: Đổi màu và đổ bóng mượt mà hơn
    if (isLocked) { 
        lockBtn.innerHTML = "🔓 Mở Khóa Tài Khoản"; 
        lockBtn.style.background = "#4CAF50"; 
        lockBtn.style.boxShadow = "0 5px 15px rgba(76, 175, 80, 0.3)";
    } else { 
        lockBtn.innerHTML = "🔒 Khóa Tài Khoản"; 
        lockBtn.style.background = "#FF9800"; 
        lockBtn.style.boxShadow = "0 5px 15px rgba(255, 152, 0, 0.3)";
    }
    lockBtn.onclick = () => { 
        window.toggleModal('user-action-modal', false); 
        if(typeof window.clickToggleLock === 'function') window.clickToggleLock(id, name, isLocked); 
    };

    // 7. NÚT XÓA: Ẩn/Hiện an toàn tuyệt đối
    if (isTargetBoss) {
        deleteBtn.style.display = 'none'; // Giấu luôn nút xóa nếu mục tiêu là Boss (Chống tự hủy)
    } else if (isGv) {
        deleteBtn.style.display = 'none'; // GV không có quyền xóa
    } else if (window.isBoss()) {
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => { 
            window.toggleModal('user-action-modal', false); 
            if(typeof window.clickDelete === 'function') window.clickDelete(id, name); 
        };
    }

    // Mở menu
    window.toggleModal('user-action-modal', true);
};

window.clickToggleLock = (i, n, l) => { 
    // 1. Chốt chặn quyền: Phải là Admin hoặc Giáo viên
    if (!window.session || (!window.isAdminLevel() && window.session.role !== 'gv')) return window.showCustomAlert("LỖI BẢO MẬT", "Hành động bị từ chối!", "🚨");

    // 2. CHỐT CHẶN MỚI: Vuốt râu hùm à? Cấm đụng Boss
    if (i === 'admin') return window.showCustomAlert("CẢNH BÁO", "Không ai được phép khóa tài khoản Boss!", "⚠️");

    if (l) window.db.ref('users/' + i).update({ isLocked: false, lockReason: null }); 
    else { 
        document.getElementById('lock-u-id').value = i; 
        document.getElementById('lock-u-name').innerText = n; 
        document.getElementById('lock-reason-input').value = ""; 
        window.toggleModal('lock-reason-modal', true); 
    } 
};

window.confirmLockUser = () => { 
    // 1. Chốt chặn quyền: Phải là Admin hoặc Giáo viên
    if (!window.session || (!window.isAdminLevel() && window.session.role !== 'gv')) return window.showCustomAlert("LỖI BẢO MẬT", "Hành động bị từ chối!", "🚨");

    const id = document.getElementById('lock-u-id').value; 

    // 2. CHỐT CHẶN MỚI: Chặn mọi ý định khóa Boss qua API ngầm
    if (id === 'admin') return window.showCustomAlert("CẢNH BÁO", "Không thể khóa tài khoản tối cao!", "⚠️");

    const reason = document.getElementById('lock-reason-input').value.trim() || "Vi phạm nội quy"; 
    window.db.ref('users/' + id).update({ isLocked: true, lockReason: reason }).then(() => window.toggleModal('lock-reason-modal', false)); 
};

window.openEditUser = (i, n, p) => { 
    document.getElementById('edit-u-old-id').value = i; 
    document.getElementById('edit-u-old-pass').value = p; 
    document.getElementById('edit-u-name').innerText = n; 
    document.getElementById('edit-u-new-id').value = i; 
    document.getElementById('edit-u-pass').value = p; 
    window.toggleModal('edit-user-modal', true); 
};

window.saveUserEdit = () => { 
    const id = document.getElementById('edit-u-old-id').value; 
    const oldPass = document.getElementById('edit-u-old-pass').value; 
    const newPass = document.getElementById('edit-u-pass').value.trim(); 
    if (newPass.length < 6) return window.showCustomAlert("Mật khẩu mới quá ngắn!");
    
    const app2 = firebase.apps.length > 1 ? firebase.app('App2') : firebase.initializeApp(firebase.app().options, 'App2');
    app2.auth().signInWithEmailAndPassword(id + '@kimminlai.com', oldPass).then((userCred) => {
        userCred.user.updatePassword(newPass).then(() => { 
            app2.auth().signOut(); 
            window.db.ref('user_passwords/' + id).update({ pass: newPass }).then(() => { 
                window.showCustomAlert("✅ Đã đổi mật khẩu thành công!"); 
                window.toggleModal('edit-user-modal', false); 
            }); 
        }).catch(e => { app2.auth().signOut(); window.showCustomAlert("Lỗi: " + e.message); });
    }).catch(e => window.showCustomAlert("❌ Không thể đồng bộ! Mật khẩu cũ không khớp Firebase."));
};

window.clickDelete = (i, n) => { 
    document.getElementById('delete-u-id').value = i; 
    document.getElementById('delete-u-name').innerText = n; 
    document.getElementById('delete-reason-input').value = ""; 
    window.toggleModal('delete-reason-modal', true); 
};
window.confirmDeleteUser = async () => { 
    // 1. Chốt chặn quyền: Phải là Admin
    if (!window.session || !window.isAdminLevel()) return window.showCustomAlert("LỖI BẢO MẬT", "Hành động bị từ chối! Chỉ Boss mới có quyền thực hiện.", "🚨");

    const id = document.getElementById('delete-u-id').value; 

    // 2. CHỐT CHẶN MỚI: Tuyệt đối không được xóa Boss
    if (id === 'admin') return window.showCustomAlert("CẢNH BÁO", "Không thể xóa tài khoản tối cao của Boss!", "⚠️");

    const reason = document.getElementById('delete-reason-input').value.trim() || "Xóa bởi Admin"; 
    
    // 1. Hiển thị trạng thái đang xử lý trên nút
    const btnSubmit = document.querySelector('#delete-reason-modal .btn-royal');
    if (btnSubmit) { 
        btnSubmit.innerText = "ĐANG THI HÀNH ÁN..."; 
        btnSubmit.disabled = true; 
    }

    try {
        // 2. Ghi log lý do xóa vào node riêng
        await window.db.ref('deleted_logs/' + id).set({ 
            reason: reason, 
            time: window.now(),
            by: window.session.id 
        }); 
        
        // 3. Danh sách xóa lẻ từng mục (lách luật bảo mật an toàn)
        const targets = [
            'users/' + id,
            'user_passwords/' + id,
            'grades/' + id,
            'tracking/' + id,
            'friends/' + id
        ];

        const promises = targets.map(path => window.db.ref(path).remove());
        await Promise.all(promises);

        // 4. HIỆN THÔNG BÁO KHI THÀNH CÔNG
        window.showCustomAlert('THÀNH CÔNG', `Đã xóa tài khoản ${id.toUpperCase()} và lưu nhật ký xóa!`, '✅');
        window.toggleModal('delete-reason-modal', false); 

    } catch (err) {
        // 5. QUAN TRỌNG: Nếu có lỗi (bị chặn), nó sẽ hiện bảng đỏ báo ngay cho ông biết
        window.showCustomAlert("❌ LỖI KHÔNG THỂ XÓA", "Firebase chặn lệnh: " + err.message, "🚨");
    } finally {
        if (btnSubmit) { 
            btnSubmit.innerText = "XÓA VĨNH VIỄN 💣"; 
            btnSubmit.disabled = false; 
        }
    }
};
// =======================================================
// BỘ LÕI: TỰ ĐỘNG TẢI, LỌC VÀ HIỂN THỊ THÔNG BÁO THEO VAI TRÒ
// =======================================================
window.__annFilter = window.__annFilter || 'all';
window.setAnnouncementFilter = (f) => {
    window.__annFilter = f;
    document.querySelectorAll('.ann-chip').forEach(c => {
        const active = c.dataset.filter === f;
        c.classList.toggle('active', active);
        c.style.background = active ? 'var(--pink)' : 'var(--card)';
        c.style.color = active ? '#fff' : 'var(--text)';
    });
    if (typeof window.__renderAnnouncementsFromCache === 'function') {
        window.__renderAnnouncementsFromCache();
    }
};

window.loadAnnouncements = () => {
    const displayEl = document.getElementById('rules-display');
    if (!displayEl) return;
    if (!window.db) { console.warn("Firebase chưa sẵn sàng để tải thông báo!"); return; }

    const currentRole = window.session?.role || "hs";
    const currentUid  = window.session?.id || "";

    // Bảo đảm hàng nút lọc tồn tại phía trên #rules-display
    let chipBar = document.getElementById('ann-filter-bar');
    if (!chipBar) {
        chipBar = document.createElement('div');
        chipBar.id = 'ann-filter-bar';
        chipBar.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;';
        chipBar.innerHTML = `
          <button class="ann-chip active" data-filter="all"    onclick="window.setAnnouncementFilter('all')"    style="padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--pink);color:#fff;font-size:12px;font-weight:bold;cursor:pointer;">Tất cả</button>
          <button class="ann-chip"        data-filter="admin"  onclick="window.setAnnouncementFilter('admin')"  style="padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--card);font-size:12px;font-weight:bold;cursor:pointer;">👑 Từ Admin</button>
          <button class="ann-chip"        data-filter="gv"     onclick="window.setAnnouncementFilter('gv')"     style="padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--card);font-size:12px;font-weight:bold;cursor:pointer;">👨‍🏫 Từ Giáo viên</button>
          <button class="ann-chip"        data-filter="hs"     onclick="window.setAnnouncementFilter('hs')"     style="padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--card);font-size:12px;font-weight:bold;cursor:pointer;">🎓 Từ Học sinh</button>
          <button class="ann-chip"        data-filter="system" onclick="window.setAnnouncementFilter('system')" style="padding:6px 12px;border-radius:20px;border:1px solid var(--border);background:var(--card);font-size:12px;font-weight:bold;cursor:pointer;">⚙️ Hệ thống</button>
        `;
        displayEl.parentNode.insertBefore(chipBar, displayEl);
    }

    window.db.ref('announcements').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        window.__renderAnnouncementsFromCache = () => {
            displayEl.innerHTML = "";
            const filt = window.__annFilter || 'all';
            let shown = 0;

            list.forEach(item => {
                const target = item.target || "all";

                // BỘ LỌC BẢO MẬT:
                //  - Admin xem hết.
                //  - Người khác chỉ xem thông báo cho 'all', đúng role của mình,
                //    hoặc gửi trực tiếp cho uid của mình (target === uid).
                if (currentRole !== 'admin'
                    && target !== 'all'
                    && target !== currentRole
                    && target !== currentUid) {
                    return;
                }

                // Phân loại nguồn gửi để lọc theo tab
                const senderRole = (item.senderRole || '').toLowerCase() || 'system';
                if (filt !== 'all' && senderRole !== filt) return;

                let targetBadge = '';
                if (target === 'all')          targetBadge = '<span style="background:rgba(0,123,255,0.1); color:#0d47a1; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:bold;">🌐 Tất Cả</span>';
                else if (target === 'hs')      targetBadge = '<span style="background:rgba(40,167,69,0.1); color:#1b5e20; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:bold;">🎓 Học Sinh</span>';
                else if (target === 'gv')      targetBadge = '<span style="background:rgba(255,193,7,0.15); color:#b78103; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:bold;">👨‍🏫 Giáo Viên</span>';
                else                           targetBadge = `<span style="background:rgba(233,30,99,0.12); color:#c2185b; padding:2px 6px; border-radius:6px; font-size:11px; font-weight:bold;">✉️ Riêng ${String(target).toUpperCase()}</span>`;

                let sourceBadge = '';
                if (senderRole === 'admin')      sourceBadge = '<span style="background:#673AB7;color:#fff;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:bold;">👑 ADMIN</span>';
                else if (senderRole === 'gv')    sourceBadge = '<span style="background:#FF9800;color:#fff;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:bold;">👨‍🏫 GV</span>';
                else if (senderRole === 'hs')    sourceBadge = '<span style="background:#4CAF50;color:#fff;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:bold;">🎓 HS</span>';
                else                             sourceBadge = '<span style="background:#607D8B;color:#fff;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:bold;">⚙️ SYS</span>';

                const date = new Date(item.timestamp || Date.now());
                const timeStr = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')} - ${date.getDate()}/${date.getMonth()+1}`;

                const deleteBtn = (currentRole === 'admin' || currentRole === 'ql')
                    ? `<button onclick="window.deleteAnnouncement('${item.id}')" style="background:none; border:none; color:var(--pink); cursor:pointer; font-size:13px; padding:5px; margin-left:8px;" title="Xóa thông báo này"><i class="fas fa-trash-alt"></i></button>`
                    : '';

                let contentHtml = String(item.content || '').replace(/</g, '&lt;');

                displayEl.insertAdjacentHTML('beforeend', `
                    <div class="card" style="border:1px solid var(--border); padding:12px; border-radius:12px; background:var(--card); display:flex; flex-direction:column; gap:6px; position:relative;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
                            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                                ${sourceBadge}
                                <span style="font-weight:900; color:var(--pink); font-size:13px;">📣 ${item.sender || "Ban Quản Trị"}</span>
                                ${targetBadge}
                            </div>
                            <div style="display:flex; align-items:center;">
                                <span style="font-size:11px; color:var(--text-light); font-weight:bold;">${timeStr}</span>
                                ${deleteBtn}
                            </div>
                        </div>
                        <div style="font-size:14px; color:var(--text); line-height:1.5; white-space:pre-line; word-break:break-word; margin-top:2px;">
                            ${contentHtml}
                        </div>
                    </div>`);
                shown++;
            });

            if (!shown) {
                displayEl.innerHTML = `<div style="text-align:center; color:var(--text-light); padding:30px; font-style:italic; font-size:13px;">📢 Không có thông báo phù hợp bộ lọc.</div>`;
            }
        };

        window.__renderAnnouncementsFromCache();
    });
};

// =======================================================
// HÀM XÓA THÔNG BÁO TRÊN FIREBASE (DÀNH CHO ADMIN)
// =======================================================
window.deleteAnnouncement = (id) => {
    if (window.session?.role !== 'admin') return;
    
    window.showCustomConfirm("GỠ THÔNG BÁO", "🚨 Bạn có chắc chắn muốn gỡ bỏ hoàn toàn thông báo này không?", () => {
        window.db.ref(`announcements/${id}`).remove()
            .then(() => {
                if (typeof window.showToast === 'function') window.showToast("🗑️ Đã gỡ thông báo thành công!");
            })
            .catch(err => {
                window.showCustomAlert("THẤT BẠI ❌", "Không thể xóa: " + err.message, "⚠️");
            });
    });
};


window.openSupportMaster = () => { window.showSupportStep('menu'); window.toggleModal('support-master-modal', true); };
window.showSupportStep = (step) => { 
    ['support-step-1', 'support-step-2', 'support-step-3'].forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.add('hidden');
    });
    if(step === 'menu') document.getElementById('support-step-1').classList.remove('hidden');
    else if (step === 'em xin LẠI-id' || step === 'em xin LẠI mk') {
        document.getElementById('support-dynamic-title').innerText = step === 'em xin LẠI-id' ? "QUÊN ID" : "QUÊN MẬT KHẨU";
        document.getElementById('support-type-hidden').value = step;
        document.getElementById('support-step-2').classList.remove('hidden');
    } else if (step === 'check-status') document.getElementById('support-step-3').classList.remove('hidden');
};
// 3. Boss mở bảng trả lời tin nhắn (Đã nâng cấp UI xịn)
window.replySupport = (reqKey, reqName, secret) => {
    // Hiển thị tên người cần hỗ trợ lên bảng
    document.getElementById('reply-u-name').innerText = reqName;
    
    // Lưu ngầm thông tin để tí nữa gửi
    document.getElementById('reply-req-key').value = reqKey;
    document.getElementById('reply-secret').value = secret;
    
    // Xóa trắng ô nhập cũ (nếu có)
    document.getElementById('reply-reason-input').value = "";
    
    // Bật cái bảng xịn xò lên
    window.toggleModal('reply-support-modal', true);
};

// Hàm này chạy khi Boss bấm nút "GỬI PHẢN HỒI" trên bảng
window.confirmReplySupport = () => {
    // Lấy dữ liệu từ bảng
    const reqKey = document.getElementById('reply-req-key').value;
    const reqName = document.getElementById('reply-u-name').innerText;
    const secret = document.getElementById('reply-secret').value;
    const reasonBox = document.getElementById('reply-reason-input').value.trim();
    
    if (!reasonBox) {
        return window.showCustomAlert("⚠️ THIẾU THÔNG TIN", "Boss chưa gõ nội dung trả lời kìa!");
    }

    // Đổi chữ nút thành Đang gửi để chống click nhầm nhiều lần
    const btn = document.querySelector('#reply-support-modal .btn-royal');
    const oldText = btn.innerText;
    btn.innerText = "ĐANG GỬI...";
    btn.disabled = true;

    // Bắn dữ liệu lên Firebase
    window.db.ref('replies/' + Date.now()).set({ 
        name: reqName, 
        secret: secret, 
        msg: reasonBox 
    }).then(() => {
        window.db.ref('inbox/' + reqKey).remove(); // Xóa khỏi hộp thư chờ
        window.showCustomAlert("THÀNH CÔNG", "Đã gửi phản hồi cho " + reqName, "✅");
        window.toggleModal('reply-support-modal', false); // Tắt bảng
    }).catch(err => {
        window.showCustomAlert("LỖI", err.message, "❌");
    }).finally(() => {
        // Trả lại trạng thái cũ cho nút
        btn.innerText = oldText;
        btn.disabled = false;
    });
};
// 4. Học sinh tự tra cứu kết quả hỗ trợ (Đã gộp & tối ưu)
window.checkSupportReply = () => {
    const n = document.getElementById('check-fullname').value.trim().toLowerCase();
    const s = document.getElementById('check-secret').value.trim();
    
    // 1. Kiểm tra đầu vào (Validation)
    if(!n || !s) {
        return window.showCustomAlert("LỖI", "Vui lòng nhập đủ Họ Tên và Mã bí mật!", "⚠️");
    }

    // 2. Hiệu ứng đang tải cho nút bấm
    const btn = document.querySelector('#support-step-3 .btn-royal');
    const oldText = btn ? btn.innerText : "XEM";
    if (btn) btn.innerText = "ĐANG TÌM KIẾM...";
    
    // 3. Truy vấn lên Firebase
    window.db.ref('replies').once('value').then(snap => {
        let found = false;
        
        snap.forEach(c => {
            const d = c.val();
            if(d.name.toLowerCase() === n && d.secret === s) {
                // Hiển thị thông báo phản hồi
                window.showCustomAlert("📩 PHẢN HỒI TỪ ANH QUÂN", d.msg, "✅");
                // Đọc xong thư tự hủy để bảo mật
                window.db.ref('replies/' + c.key).remove(); 
                found = true;
            }
        });
        
        // 4. Xử lý khi không tìm thấy
        if(!found) {
            window.showCustomAlert("CHƯA CÓ KẾT QUẢ", "Boss chưa phản hồi hoặc bạn nhập sai thông tin!", "⏳");
        }
        
        // Trả lại text cũ cho nút bấm
        if (btn) btn.innerText = oldText;
        
    }).catch(err => {
        // Phòng hờ trường hợp đứt mạng khi đang check
        window.showCustomAlert("LỖI KẾT NỐI", "Không thể kiểm tra phản hồi lúc này!", "❌");
        if (btn) btn.innerText = oldText;
    });
};


// TIỆN ÍCH TẠO ID CUỘC TRÒ CHUYỆN BẢO ĐẢM
window.getConvoId = (id1, id2) => { return [id1, id2].sort().join('_'); };
// ==========================================
// BẢN VÁ: BỘ LỌC TÌM KIẾM CHO TRUNG TÂM GIÁM SÁT
// ==========================================
window.filterAdminSpy = (element) => {
    let filterText = '';
    // Hỗ trợ cả trường hợp HTML truyền this (element) hoặc tự tìm ô input
    if (element && element.value !== undefined) {
        filterText = element.value.toLowerCase();
    } else {
        const input = document.querySelector('#admin-spy-zone input');
        if (input) filterText = input.value.toLowerCase();
    }
    
    // Quét toàn bộ các cuộc hội thoại đang hiển thị
    const items = document.querySelectorAll('.spy-convo-item');
    items.forEach(item => {
        if (item.innerText.toLowerCase().includes(filterText)) {
            item.style.display = ''; // Hiện nếu khớp
        } else {
            item.style.display = 'none'; // Ẩn nếu không khớp
        }
    });
};

// ==========================================
// BẢN VÁ: HIỂN THỊ ẢNH XEM TRƯỚC KHI CẤP AVATAR
// ==========================================
window.previewGrantImg = (element) => {
    // Tìm thẻ input chứa file ảnh (hỗ trợ cả trường hợp HTML truyền thẳng this hoặc tự tìm)
    let fileInput = element;
    if (!fileInput || !fileInput.files) {
        // Tìm input ẩn thường được dùng cho tính năng này
        fileInput = document.getElementById('grant-file') || document.querySelector('input[type="file"][onchange*="previewGrantImg"]');
    }

    if (fileInput && fileInput.files && fileInput.files[0]) {
        // Lưu file vào biến tạm để hàm window.grantAvatar (ở Phần 11) có thể lấy và up lên ImgBB
        window.tempGrantFile = fileInput.files[0];
        
        // Đọc file và hiển thị lên màn hình
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('grant-preview-img');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
};
// ==========================================
// BẢN VÁ: LẮNG NGHE TRẠNG THÁI BẢO TRÌ TỪ FIREBASE
// ==========================================
const initMaintenanceWatch = setInterval(() => {
    // Đợi đến khi Firebase được khởi tạo xong
    if (window.db) {
        clearInterval(initMaintenanceWatch); // Tắt bộ đếm
        
        // 1. Lắng nghe mã PIN bí mật
        window.db.ref('config/clearPin').on('value', s => { 
            window.currentClearPin = s.val() || "654321"; 
        });
        
        // 2. Lắng nghe công tắc Bảo trì (True/False)
        window.db.ref('config/maintenance').on('value', s => {
            window.isMaintenance = s.val() === true;
            if (typeof window.updateMaintenanceUI === 'function') {
                window.updateMaintenanceUI();
            }
        });
        
        // 3. Lắng nghe lời nhắn bảo trì hiển thị cho học sinh
        window.db.ref('config/maintenanceMsg').on('value', s => {
            const disp = document.getElementById('maintenance-text-display');
            if(disp) disp.innerText = s.val() || "Hệ thống đang bảo trì. Vui lòng quay lại sau nhé!";
        });
    }
}, 500); // Mỗi nửa giây check 1 lần xem db đã sẵn sàng chưa
// ==========================================
// BẢN VÁ: HÀM HIỂN THỊ HỘP THOẠI THÔNG BÁO TÙY CHỈNH
// ==========================================
// Thay thế hàm showCustomAlert trong script.js
window.showCustomAlert = (title = '', message = '', icon = '') => {
    const titleEl = document.getElementById('custom-alert-title');
    const msgEl = document.getElementById('custom-alert-message');
    const iconEl = document.getElementById('custom-alert-icon');
    const modalBox = document.querySelector('#custom-alert-modal .modal-box');
    const btnOk = document.querySelector('#custom-alert-modal .btn-royal');
    
    // Dùng màu phụng vụ đang áp dụng để hộp thoại (kể cả báo lỗi) đồng bộ màu
    const pinkSystem = (getComputedStyle(document.documentElement).getPropertyValue('--pink') || '').trim() || '#ff4d94';
    
    // Gán giá trị (nếu không có thì để trống thay vì hiện undefined)
    if (titleEl) { 
        titleEl.innerText = title || ''; 
        titleEl.style.color = pinkSystem; 
    }
    if (msgEl) {
        msgEl.innerText = message || '';
        // Làm chữ nhỏ lại thêm 1 tí theo ý bạn
        msgEl.style.fontSize = "11px"; 
        msgEl.style.opacity = "0.8";
    }
    if (iconEl) iconEl.innerText = icon || '';
    
    if (modalBox) {
        modalBox.style.borderTop = `8px solid ${pinkSystem}`;
    }
    
    if (btnOk) {
        btnOk.style.background = pinkSystem;
        btnOk.innerText = "ĐÃ HIỂU 👍";
    }
    
    window.toggleModal('custom-alert-modal', true);
};
window.showCustomConfirm = (title, message, onConfirmCallback) => {
    const titleEl = document.getElementById('custom-confirm-title');
    const msgEl = document.getElementById('custom-confirm-message');
    const btnConfirm = document.getElementById('custom-confirm-btn');

    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;

    // Gán chức năng khi ông bấm ĐỒNG Ý thì nó chạy cái hàm callback truyền vào
    btnConfirm.onclick = () => {
        window.toggleModal('custom-confirm-modal', false);
        if (typeof onConfirmCallback === 'function') onConfirmCallback();
    };

    // Mở bảng lên
    window.toggleModal('custom-confirm-modal', true);
};


// ==========================================
// BẢN VÁ: HỆ THỐNG XÓA TRẮNG DỮ LIỆU (HARD RESET)
// ==========================================

// 1. Mở hộp thoại yêu cầu nhập mã PIN bảo mật
window.openClearDataAuth = () => {
    if (!window.isBoss()) return window.showCustomAlert('KHÔNG CÓ QUYỀN', 'Chỉ Boss mới được thực hiện thao tác này!', '🔒');
    document.getElementById('clear-pin-input').value = ""; // Xóa trắng ô nhập cũ
    window.toggleModal('clear-auth-modal', true);
};

// 2. Kiểm tra mã PIN Boss nhập vào
window.verifyClearPin = () => {
    if (!window.isBoss()) return window.showCustomAlert('KHÔNG CÓ QUYỀN', 'Chỉ Boss mới được thực hiện thao tác này!', '🔒');
    const pin = document.getElementById('clear-pin-input').value;
    
    window.db.ref('config/clearPin').once('value').then(snap => {
        const realPin = snap.val();
        if (pin === realPin) {
            window.toggleModal('clear-auth-modal', false);
            window.toggleModal('clear-confirm-modal', true); 
        } else {
            window.showCustomAlert("❌ Sai mã PIN bảo mật! Hành động bị từ chối.");
        }
    });
};


window.executeHardReset = async () => {
    // 1. Chốt chặn quyền: Phải là Admin
    if (!window.session || !window.isAdminLevel()) return window.showCustomAlert("LỖI BẢO MẬT", "Hành động bị từ chối! Chỉ Boss mới có quyền thực hiện.", "🚨");

    const btn = document.querySelector('#clear-confirm-modal .btn-royal');
    if(btn) { btn.innerText = "ĐANG QUÉT SẠCH..."; btn.disabled = true; }
    
    // Danh sách các mục cần xóa (chia nhỏ để tránh bị Firebase chặn quyền root)
    const nodes = [
        'users', 'user_passwords', 'grades', 'tracking', 'friends', 
        'chat', 'chat_streaks', 'groups', 'inbox', 'replies', 
        'announcements', 'deleted_logs', 'typing', 'unread', 'config'
    ];

    try {
        // Xóa từng mục một thay vì xóa cả gốc
        const promises = nodes.map(node => window.db.ref(node).remove());
        await Promise.all(promises);
        
        window.showCustomAlert("💥 THÀNH CÔNG", "Hệ thống đã được dọn dẹp sạch sẽ!", "✅");
        window.handleLogout(); 
    } catch (e) {
        window.showCustomAlert("❌ LỖI PHÂN QUYỀN", "Firebase chặn lệnh xóa diện rộng: " + e.message, "🚨");
        if(btn) { btn.innerText = "KÍCH HOẠT NÉM BOM 💥"; btn.disabled = false; }
    }
};


// ==========================================
// BẢN VÁ: HIỆN NÚT BẢO TRÌ & QUẢN LÝ DỮ LIỆU
// ==========================================

// 1. Ghi đè hàm chuyển tab để hiện vùng của Boss
const originalSwitchTab = window.switchTab;
window.switchTab = (id) => {
    originalSwitchTab(id);
    if (id === 'settings' && window.session && window.isAdminLevel()) {
        const secZone = document.getElementById('admin-security-zone');
        if (secZone) secZone.classList.remove('hidden'); // Mở khóa vùng bảo trì
        
        // Cập nhật trạng thái công tắc từ Firebase
        window.db.ref('config/maintenance').once('value').then(s => {
            const toggle = document.getElementById('maintenance-toggle');
            if (toggle) toggle.checked = (s.val() === true);
        });
    }
};

// 2. Hàm bật/tắt bảo trì
window.toggleMaintenanceMode = (checkbox) => {
    const isMaint = checkbox.checked;
    let msg = "Hệ thống đang bảo trì. Vui lòng quay lại sau nhé!";
    if (isMaint) {
        const customMsg = prompt("Nhập lời nhắn bảo trì:", msg);
        if (customMsg) msg = customMsg;
    }
    window.db.ref('config').update({ maintenance: isMaint, maintenanceMsg: msg }).then(() => {
        window.maintenanceBypass = true;
        window.showCustomAlert(isMaint ? "🛠️ Đã BẬT bảo trì!" : "✅ Đã TẮT bảo trì!");
    });
};

// ==========================================
// BẢN VÁ: QUẢN LÝ GIAO DIỆN (ĐỔI TÊN & LOGO)
// ==========================================

// 1. Hiển thị xem trước Logo Đăng nhập
window.previewBrandLogo = (element) => {
    if (element.files && element.files[0]) {
        window.tempBrandFile = element.files[0]; // Lưu tạm file để lát up lên ImgBB
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('brand-preview-logo');
            if(img) {
                img.src = e.target.result;
                img.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(element.files[0]);
    }
};

// 2. Hiển thị xem trước Ảnh màn hình chờ (Splash)
window.previewSplashLogo = (element) => {
    if (element.files && element.files[0]) {
        window.tempSplashFile = element.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('splash-preview-logo');
            if(img) {
                img.src = e.target.result;
                img.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(element.files[0]);
    }
};

// 3. Xử lý lưu toàn bộ lên Firebase
window.saveBranding = async () => {
    const nameInput = document.getElementById('brand-name-input').value.trim();
    let brandUrl = null;
    let splashUrl = null;

    // Hiện thông báo vì quá trình up ảnh có thể mất vài giây
    if(typeof window.showCustomAlert === 'function') {
        window.showCustomAlert('ĐANG XỬ LÝ', 'Đang tải hình ảnh lên hệ thống, vui lòng chờ...', '⏳');
    }

    // Tải logo đăng nhập lên ImgBB nếu Boss có chọn ảnh mới
    if (window.tempBrandFile) {
        brandUrl = await window.uploadToImgBB(window.tempBrandFile);
    }

    // Tải logo màn hình chờ lên ImgBB nếu Boss có chọn ảnh mới
    if (window.tempSplashFile) {
        splashUrl = await window.uploadToImgBB(window.tempSplashFile);
    }

    // Lấy dữ liệu cũ để không bị mất nếu Boss chỉ đổi 1 thứ
    window.db.ref('config/branding').once('value').then(snap => {
        const current = snap.val() || {};
        const updates = {
            name: nameInput || current.name || "LỚP HỌC CÔNG GIÁO" // Ưu tiên tên mới, không có thì lấy tên cũ
        };
        
        // Nếu có ảnh mới thì dùng, không thì lấy ảnh cũ
        if (brandUrl) updates.logo = brandUrl;
        else if (current.logo) updates.logo = current.logo; 

        if (splashUrl) updates.splashLogo = splashUrl;
        else if (current.splashLogo) updates.splashLogo = current.splashLogo;

        // Lưu tất cả lên Firebase
        window.db.ref('config/branding').set(updates).then(() => {
            window.tempBrandFile = null;
            window.tempSplashFile = null;
            
            if(typeof window.showCustomAlert === 'function') {
                window.showCustomAlert('THÀNH CÔNG', 'Giao diện đã được lưu! Đang khởi động lại...', '✅');
            } else {
                window.showCustomAlert("✅ Đã lưu giao diện thành công!");
            }
            
            // Tải lại trang để áp dụng giao diện mới ngay lập tức
            setTimeout(() => location.reload(), 1500); 
        });
    });
};

// ==========================================
// BẢN VÁ: XEM ẢNH FULL MÀN HÌNH (CHAT & AVATAR)
// ==========================================

// 1. Hàm phóng to ảnh trong khung chat
window.viewFullImage = (url) => {
    const viewer = document.getElementById('avatar-viewer-modal');
    const fullImg = document.getElementById('full-avatar-img');
    if (viewer && fullImg) {
        fullImg.src = url;
        // Sử dụng toggleModal đã có sẵn trong Phần 5
        window.toggleModal('avatar-viewer-modal', true);
    }
};

// 2. Hàm phóng to ảnh đại diện khi xem hồ sơ
window.viewFullAvatar = () => {
    const profileAvt = document.getElementById('profile-avatar');
    if (profileAvt && profileAvt.src) {
        window.viewFullImage(profileAvt.src);
    }
};
// ==========================================
// BẢN VÁ: CHỨC NĂNG ĐỔI MÃ PIN HỆ THỐNG
// ==========================================

// 1. Mở Modal đổi PIN
window.openChangePinModal = () => {
    if (!window.isBoss()) return window.showCustomAlert('KHÔNG CÓ QUYỀN', 'Chỉ Boss mới được thực hiện thao tác này!', '🔒');

    // 2. Tìm ô nhập liệu mã PIN mới
    const pinInput = document.getElementById('new-clear-pin-input');
    
    // 3. Nếu tìm thấy thì xóa trắng nội dung cũ, nếu không thấy thì báo lỗi để kiểm tra HTML
    if (pinInput) {
        pinInput.value = "";
        window.toggleModal('change-pin-modal', true);
    } else {
        console.error("Lỗi: Không tìm thấy ID 'new-clear-pin-input' trong HTML!");
        window.showCustomAlert("🚨 Lỗi giao diện: Không tìm thấy ô nhập PIN mới. Boss kiểm tra lại file HTML nhé!");
    }
};


// 2. Lưu mã PIN mới lên Firebase
window.saveNewClearPin = () => {
    if (!window.isBoss()) return window.showCustomAlert('KHÔNG CÓ QUYỀN', 'Chỉ Boss mới được thực hiện thao tác này!', '🔒');
    const newPin = document.getElementById('new-clear-pin-input').value.trim();
    
    // Kiểm tra độ dài PIN (nên từ 4-6 số)
    if (newPin.length < 4) {
        return window.showCustomAlert("❌ Mã PIN quá ngắn! Vui lòng nhập ít nhất 4 ký tự.");
    }

    window.showCustomConfirm("ĐỔI MÃ PIN", "⚠️ Xác nhận đổi mã PIN hệ thống? Sau khi đổi, bạn phải dùng mã mới để Xóa dữ liệu hoặc Bảo trì.", () => {
        // Cập nhật lên Firebase tại node config/clearPin
        window.db.ref('config').update({
            clearPin: newPin
        }).then(() => {
            window.showCustomAlert('THÀNH CÔNG', 'Mã PIN hệ thống đã được thay đổi!', '✅');
            window.toggleModal('change-pin-modal', false);
        }).catch(err => {
            window.showCustomAlert("LỖI", "Không thể cập nhật PIN: " + err.message, "❌");
        });
    });
};
// ==========================================
// BẢN VÁ: TÍNH NĂNG ĐỔI MẬT KHẨU ADMIN (BOSS)
// ==========================================

window.openAdminPasswordModal = () => {
    if (!window.isBoss()) return window.showCustomAlert('KHÔNG CÓ QUYỀN', 'Chỉ Boss mới được thực hiện thao tác này!', '🔒');
    if (!window.isAdminLevel()) return window.showCustomAlert("🚫 Chỉ Boss mới được dùng tính năng này!");
    document.getElementById('admin-old-pass').value = "";
    document.getElementById('admin-new-pass').value = "";
    window.toggleModal('admin-password-modal', true);
};

window.confirmChangeAdminPassword = () => {
    const oldPass = document.getElementById('admin-old-pass').value.trim();
    const newPass = document.getElementById('admin-new-pass').value.trim();
    
    if (!oldPass || !newPass) return window.showCustomAlert("⚠️ Vui lòng nhập đầy đủ thông tin!");
    if (newPass.length < 6) return window.showCustomAlert("❌ Mật khẩu mới quá ngắn (tối thiểu 6 ký tự)!");

    const email = 'admin@kimminlai.com'; 

    // Xác thực danh tính bằng mật khẩu cũ
    firebase.auth().signInWithEmailAndPassword(email, oldPass).then((userCredential) => {
        // Cập nhật mật khẩu mới lên hệ thống Auth
        userCredential.user.updatePassword(newPass).then(() => {
            // Đồng bộ mật khẩu mới vào Database để Boss xem lại nếu quên
            window.db.ref('user_passwords/admin').update({
                pass: newPass
            }).then(() => {
                if (typeof window.showCustomAlert === 'function') {
                    window.showCustomAlert('THÀNH CÔNG', 'Mật khẩu Boss đã được thay đổi!', '✅');
                } else {
                    window.showCustomAlert("✅ Đổi mật khẩu thành công!");
                }
                window.toggleModal('admin-password-modal', false);
            });
        }).catch(err => {
            window.showCustomAlert("❌ Lỗi Auth: " + err.message);
        });
    }).catch(err => {
        window.showCustomAlert("❌ Mật khẩu hiện tại không chính xác!");
    });
};
// Bổ sung vào cuối script.js để sửa lỗi ở ảnh 1000091344.jpg
window.openCreateGroupModal = () => {
    const input = document.getElementById('new-group-name-input');
    if (input) input.value = "Nhóm Học Tập";
    window.toggleModal('create-group-modal', true);
};

window.confirmCreateGroup = () => {
    const name = document.getElementById('new-group-name-input').value.trim();
    if (!name) return window.showCustomAlert("THIẾU TÊN", " chưa đặt tên nhóm kìa!", "⚠️");

    const gid = 'grp_' + Date.now();
    const members = {};
    members[window.session.id] = true;

    window.db.ref('groups/' + gid).set({
        name: name,
        admin: window.session.id,
        members: members,
        time: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        window.showCustomAlert("THÀNH CÔNG", "Đã lập nhóm " + name + "!", "🚀");
        window.toggleModal('create-group-modal', false);
        // Tự động mở chat nhóm vừa tạo
        if (typeof window.openGroupChat === 'function') {
            window.openGroupChat(gid, name, window.session.id);
        }
    });
};
// ==========================================
// BẢN VÁ: THẢ BIỂU CẢM & ĐẶT BIỆT DANH
// ==========================================
// 1. Hàm mở bảng đổi tên (Modal mới)
window.setNickname = (targetId, currentName) => {
    // Lưu lại ID đang chọn để tí nữa hàm Save còn biết mà lưu vào Firebase
    window.currentNicknameTarget = targetId;
    
    const input = document.getElementById('nickname-input');
    const nameDisp = document.getElementById('nickname-target-name');
    
    // Hiển thị tên người đang được đổi biệt danh
    if (nameDisp) nameDisp.innerText = currentName;
    
    // Lấy lại biệt danh cũ (nếu có) hiện lên ô nhập cho dễ sửa
    if (input) {
        input.value = (window.myNicknames && window.myNicknames[targetId]) ? window.myNicknames[targetId] : "";
        input.focus();
    }
    
    window.toggleModal('nickname-modal', true);
};

// 2. Hàm thực hiện lưu biệt danh lên Firebase
window.confirmSaveNickname = () => {
    const input = document.getElementById('nickname-input');
    const nick = input ? input.value.trim() : "";
    const targetId = window.currentNicknameTarget;
    
    if (!targetId || !window.session) return;

    // Nếu để trống thì xóa biệt danh, nếu có chữ thì lưu vào
    if (nick === "") {
        window.db.ref(`nicknames/${window.session.id}/${targetId}`).remove();
    } else {
        window.db.ref(`nicknames/${window.session.id}/${targetId}`).set(nick);
    }
    
    // Đóng bảng và báo thành công
    window.toggleModal('nickname-modal', false);
    if (typeof window.showCustomAlert === 'function') {
        window.showCustomAlert("THÀNH CÔNG", "Đã cập nhật biệt danh sạch sẽ!", "✅");
    }
};


// 1. HÀM XỬ LÝ KHI ẤN GIỮ HOẶC BẤM VÀO TIN NHẮN
window.handleMessageLongPress = (e, type, convoId, msgKey, isMe, isAdmin) => {
    if (e) e.preventDefault(); // Chặn menu chuột phải mặc định của máy
    
    window.currentReactionTarget = { type, convoId, msgKey };

    const unsendBtn = document.getElementById('action-unsend-btn');
    if (unsendBtn) {
        // Chỉ hiện nút Thu hồi nếu là chủ tin nhắn hoặc là Boss
        if (isMe || isAdmin) {
            unsendBtn.style.display = 'block';
            unsendBtn.onclick = () => {
                window.toggleModal('msg-action-modal', false);
                window.unsendMsg(type, convoId, msgKey);
            };
        } else {
            unsendBtn.style.display = 'none'; // Người khác thì giấu nút xóa đi
        }
    }

    window.toggleModal('msg-action-modal', true);
};

// 2. NÂNG CẤP HÀM GỬI CẢM XÚC (LƯU VÀO FIREBASE VÀ ĐÓNG MENU)
window.sendReaction = (emoji) => {
    if(!window.currentReactionTarget || !window.session) return;
    const { type, convoId, msgKey } = window.currentReactionTarget;
    let refPath = type.startsWith('global') ? `chat/${type}/${msgKey}/reactions/${window.session.id}` : `chat/${type}/${convoId}/${msgKey}/reactions/${window.session.id}`;
    
    if (emoji === 'remove') window.db.ref(refPath).remove();
    else window.db.ref(refPath).set(emoji);
    
    window.toggleModal('msg-action-modal', false);
};

// 3. BẢN VÁ: RENDER BONG BÓNG CHAT SẠCH SẼ (GIẤU NÚT, THÊM SỰ KIỆN CLICK)
window.renderMessage = (msg, isMe, msgKey, type, convoId) => {
    // 🕵️ ẨN ADMIN: nếu người xem KHÔNG phải admin, tin nhắn do admin gửi bị ẩn hoàn toàn.
    if (window.session && !window.isAdminLevel()) {
        if (msg && (msg.id === 'admin' || (window.allUsersMapFull && window.allUsersMapFull[msg.id] && window.allUsersMapFull[msg.id].role === 'admin'))) {
            return '';
        }
    }
    const align = isMe ? 'align-self:flex-end;' : 'align-self:flex-start;';
    const bgClass = isMe ? 'msg-me' : 'msg-other';
    const defaultBg = isMe ? 'background:var(--pink); color:white;' : 'background:var(--soft); color:var(--text);';
    const nameColor = isMe ? 'rgba(255,255,255,0.8)' : 'var(--text-light)';
    
    let txtHtml = msg.text;
    let isUnsent = false;
    
    if(txtHtml === '[UNSENT]') {
        txtHtml = '<i style="color:var(--text-light); font-size:12px;">Tin nhắn đã thu hồi</i>';
        isUnsent = true;
    } else if(txtHtml && txtHtml.startsWith('[IMG]') && txtHtml.endsWith('[/IMG]')) {
        let rawUrl = txtHtml.replace('[IMG]','').replace('[/IMG]','');
        let safeUrl = window.escapeHTML(rawUrl); 
        txtHtml = `<img src="${safeUrl}" style="max-height:180px; max-width:100%; border-radius:10px; cursor:pointer; display:block; margin-top:5px;" onclick="event.stopPropagation(); window.viewFullImage('${safeUrl}')">`;
    } else {
        txtHtml = window.escapeHTML(txtHtml);
    }

    const isAdmin = window.session && window.isAdminLevel();

    let reactionHtml = '';
    if (msg.reactions) {
        let Object_keys = Object.keys(msg.reactions);
        if(Object_keys.length > 0) {
            let counts = {};
            for(let uid in msg.reactions) {
                let r = msg.reactions[uid];
                counts[r] = (counts[r] || 0) + 1;
            }
            reactionHtml = `<div class="msg-reaction-badge" style="position:absolute; bottom:-14px; ${isMe ? 'right:15px;' : 'left:15px;'} background:var(--card); border:1px solid var(--border); border-radius:20px; padding:3px 8px; font-size:13px; box-shadow:0 3px 8px rgba(0,0,0,0.15); display:flex; gap:4px; z-index:2; color:var(--text);" onclick="event.stopPropagation(); window.handleMessageLongPress(event, '${type}', '${convoId}', '${msgKey}', ${isMe}, ${isAdmin})">`;
            for(let r in counts) reactionHtml += `<span>${r} <small style="font-size:10px; font-weight:bold; opacity:0.7;">${counts[r]}</small></span>`;
            reactionHtml += `</div>`;
        }
    }

    // BẢN VÁ: Đảm bảo Tên và Biệt danh đều được khử mã độc
    const rawName = (window.myNicknames && window.myNicknames[msg.id]) ? window.myNicknames[msg.id] : msg.name;
    const dName = window.escapeHTML(rawName);

    const clickEvent = isUnsent ? '' : `oncontextmenu="window.handleMessageLongPress(event, '${type}', '${convoId}', '${msgKey}', ${isMe}, ${isAdmin})" onclick="window.handleMessageLongPress(event, '${type}', '${convoId}', '${msgKey}', ${isMe}, ${isAdmin})"`;

    return `<div id="msg-${msgKey}" class="${bgClass}" style="max-width:75%; ${align} ${defaultBg} padding:10px 14px; border-radius:20px; position:relative; margin-bottom:24px; cursor:pointer; transition:0.2s;" ${clickEvent}>
        <div style="font-size:11px; font-weight:bold; margin-bottom:4px; color:${nameColor};" onclick="event.stopPropagation(); window.openUserProfile('${msg.id}')">${dName}</div>
        <div style="font-size:14.5px; word-break:break-word;">${txtHtml}</div>
        ${reactionHtml}
    </div>`;
};
// ==========================================
// KÍCH HOẠT HỆ THỐNG - ĐỪNG XÓA DÒNG NÀY!
// ==========================================
// Chốt chặn an toàn: Đợi tải xong hết web mới gọi Firebase
window.addEventListener('load', () => {
    if (typeof firebase !== 'undefined') {
        initFirebase();

        firebase.auth().onAuthStateChanged(user => {
            if(user) {
                setTimeout(() => {
                    if(window.session && window.db) {
                        window.db.ref('nicknames/' + window.session.id).on('value', snap => {
                            window.myNicknames = snap.val() || {};
                            if(typeof window.renderRecentChats === 'function') window.renderRecentChats();
                            if(window.currentPrivateConvo) {
                                const targetId = window.currentPrivateConvo.split('_').find(id => id !== window.session.id);
                                if(targetId) {
                                    const dName = window.myNicknames[targetId] || window.allUsersMap[targetId]?.name || targetId;
                                    const titleEl = document.getElementById('private-chat-title');
                                    if(titleEl) titleEl.innerHTML = `💬 ${dName} <span onclick="window.setNickname('${targetId}', '${dName}')" style="font-size:12px; cursor:pointer; color:var(--text-light); margin-left:5px;">✏️</span>`;
                                }
                            }
                        });
                    }
                }, 1500);
            }
        });
    } else {
        console.error("Firebase chưa được tải về.");
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert("🚨 LỖI MẠNG", "Không tải được dữ liệu máy chủ. Vui lòng kiểm tra 4G/Wifi hoặc tắt trình chặn quảng cáo!", "❌");
        } else {
            window.showCustomAlert("🚨 Không tải được dữ liệu máy chủ. Vui lòng kiểm tra mạng!");
        }
    }
});

// ==========================================
// BẢN VÁ: TƯƠNG THÍCH ĐIỀU KHIỂN REMOTE TV
// ==========================================

// 1. Tự động khoanh vùng ô nhập ID khi vừa vào web để Remote dễ điều khiển
window.addEventListener('load', () => {
    setTimeout(() => {
        const idInput = document.getElementById('username');
        if (idInput && !window.session) idInput.focus();
    }, 1500);
});

// 2. Ép nút "OK" trên Remote TV (phím Enter) hoạt động như thao tác chọc tay (Click)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const el = document.activeElement; // Lấy phần tử đang được khoanh vùng sáng
        
        // Bỏ qua nếu đang gõ chữ trong ô chat (để tránh gửi tin nhắn 2 lần)
        if (el.tagName === 'INPUT' && el.id.includes('chat-input')) return;
        
        // Nếu đang đứng ở các nút bấm hoặc danh sách, ép nó click
        if (el.tagName === 'BUTTON' || el.classList.contains('tt-item') || el.classList.contains('spy-convo-item')) {
            e.preventDefault(); // Chặn hành vi mặc định
            el.click();
        }
    }
});
window.confirmSaveScore = () => {
    // 1. Chốt chặn quyền: Phải là Admin hoặc Giáo viên
    if (!window.session || (!window.isAdminLevel() && window.session.role !== 'gv')) return window.showCustomAlert("LỖI BẢO MẬT", "Hành động bị từ chối! Chỉ Giáo viên hoặc Boss mới có quyền thực hiện.", "🚨");

    const id = document.getElementById('score-u-id').value;
    const term = document.getElementById('score-term').value;
    if(!id) return;

    let vm = parseFloat(document.getElementById('score-m').value) || 0;
    let vp = parseFloat(document.getElementById('score-15p').value) || 0;
    let vt = parseFloat(document.getElementById('score-1t').value) || 0;
    let vthi = parseFloat(document.getElementById('score-thi').value) || 0;

    // 2. CHỐT CHẶN MỚI: Chống bug nhập điểm ảo > 10 hoặc < 0
    if (vm < 0 || vm > 10 || vp < 0 || vp > 10 || vt < 0 || vt > 10 || vthi < 0 || vthi > 10) {
        return window.showCustomAlert("LỖI NHẬP LIỆU", "Điểm số không hợp lệ! Vui lòng nhập từ 0 đến 10.", "⚠️");
    }

    const data = { m: vm, p: vp, t: vt, thi: vthi, hk: document.getElementById('score-conduct').value };

    window.db.ref(`grades/${id}/hk${term}`).set(data).then(() => {
        // LỆNH QUAN TRỌNG: Ghi nhật ký sửa điểm vào Firebase
        const _tName = (window.allUsersMap && window.allUsersMap[id] && window.allUsersMap[id].name) ? window.allUsersMap[id].name : (document.getElementById('score-student-name')?.textContent || id);
        window.db.ref('grade_logs').push({
            by_id: window.session.id,
            by_name: window.session.name,
            target_id: id,
            target_name: _tName,
            term: term,
            time: window.now()
        });

        window.showCustomAlert('THÀNH CÔNG', 'Đã cập nhật điểm và ghi lại nhật ký!', '✅');
        window.toggleModal('score-modal', false);
    });
};

// ==========================================
// HÀM TỔNG HỢP: TẢI TOÀN BỘ TAB THEO DÕI (ĐÃ UPDATE BẢN ĐỒ MAPS)
// ==========================================
const getShortDevice = (ua) => {
    if (!ua) return "Không rõ";
    let os = "Khác", br = "Khác";
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac") && !ua.includes("iPhone")) os = "MacOS";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Android")) os = "Android";
    if (ua.includes("Edg")) br = "Edge";
    else if (ua.includes("Coc_Coc") || ua.includes("coc_coc")) br = "Cốc Cốc";
    else if (ua.includes("Chrome")) br = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) br = "Safari";
    return `${os} (${br})`;
};
// ==========================================
// BẢN VÁ: CHỨC NĂNG DỌN DẸP LỊCH SỬ SỬA ĐIỂM
// ==========================================
window.clearGradeLogs = () => {
    if (!window.session) return;
    if (!window.isAdminLevel()) {
        return window.showCustomAlert("CẢNH BÁO", "Chỉ Boss tối cao mới có quyền dọn dẹp lịch sử sửa điểm!", "🚨");
    }

    window.showCustomConfirm("DỌN DẸP LỊCH SỬ", "Bạn có chắc chắn muốn xóa sạch toàn bộ nhật ký sửa điểm không? Hành động này không thể hoàn tác!", () => {
        window.db.ref('grade_logs').remove().then(() => {
            window.showToast("✅ Đã dọn sạch lịch sử sửa điểm!");
        }).catch(err => {
            window.showCustomAlert("LỖI HỆ THỐNG", "Không thể xóa: " + err.message, "❌");
        });
    });
};

// ==========================================
// 1. HÀM GỬI HỖ TRỢ SOS (GPS CHÍNH XÁC)
// ==========================================
window.submitSupportRequest = () => { 
    const n = document.getElementById('support-fullname').value.trim(); 
    const s = document.getElementById('support-secret').value.trim(); 
    const t = document.getElementById('support-type-hidden').value;
    
    if (!n || !s) return window.showCustomAlert("Điền đủ thông tin!");

    const todayStr = window.getDateStr();
    if (localStorage.getItem('lastSosDate') === todayStr) {
         return window.showCustomAlert("🚫 BẠN ĐÃ GỬI RỒI\nVui lòng chờ ANH QUÂN phản hồi trước khi gửi tiếp nhé! Tầm 5 tiếng có nha 🥰");
    }

    const btn = document.querySelector('#support-step-2 .btn-royal');
    const oldText = btn.innerText;
    btn.innerText = "đang yêu cầu vui lòng đợi 🥰";
    btn.disabled = true;

    const sendDataToFirebase = (lat, lng, errorMsg = "") => {
        btn.innerText = "ĐANG GỬI...";
        const reqTime = window.now();

        window.db.ref('inbox/' + reqTime).set({ 
            name: n, req: t, secret: s, time: reqTime,
            lat: lat, lng: lng, device: navigator.userAgent,
            gpsError: errorMsg // Lưu lại lỗi để Boss biết tại sao bị chặn
        }).then(() => {
            localStorage.setItem('lastSosDate', todayStr); 
            window.showCustomAlert("✅ Đã gửi! Hãy nhớ Mã bí mật ["+s+"] để tra cứu kết quả nhé.");
            window.toggleModal('support-master-modal', false);
            btn.innerText = oldText; btn.disabled = false;
        }).catch(err => {
            window.showCustomAlert("❌ Lỗi: " + err.message);
            btn.innerText = oldText; btn.disabled = false;
        });
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => sendDataToFirebase(pos.coords.latitude, pos.coords.longitude),
            (err) => sendDataToFirebase(null, null, "Lỗi/Bị chặn: " + err.message),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    } else { 
        sendDataToFirebase(null, null, "Trình duyệt không hỗ trợ GPS"); 
    }
};

// ==========================================
// HÀM TỔNG HỢP: TẢI TOÀN BỘ TAB THEO DÕI (ĐÃ NÂNG CẤP XỊN XÒ)
// ==========================================

// 1. HÀM KÍCH HOẠT LÀM MỚI BẰNG TAY (NÚT LÀM MỚI)
window.refreshTracking = () => {
    const btn = document.getElementById('btn-refresh-track');
    if(btn) { btn.innerHTML = '⏳ Đang quét...'; btn.disabled = true; }
    
    window.db.ref('tracking').once('value').then(s => {
        window.renderTrackingTable(s);
        if(btn) { btn.innerHTML = '🔄 LÀM MỚI'; btn.disabled = false; }
        if(typeof window.showToast === 'function') window.showToast("✅ Đã cập nhật trạng thái mới nhất!");
    }).catch(e => {
        if(btn) { btn.innerHTML = '🔄 LÀM MỚI'; btn.disabled = false; }
    });
};

// 2. HÀM VẼ BẢNG ONLINE/OFFLINE (CÓ HIỆU ỨNG ĐÈN XANH)
window.renderTrackingTable = (snap) => {
    let h = ''; 
    const d = snap.val() || {}; 
    const pad = num => num < 10 ? '0' + num : num; 
    const fmtDate = ms => { 
        if (!ms) return '--:--'; 
        const dt = new Date(ms); 
        return pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ' ' + pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1); 
    }; 
    
    // Thuật toán: Đẩy những người Online hoặc mới truy cập lên đầu bảng
    let userList = [];
    for (let i in d) {
        const _r = (window.allUsersMapFull && window.allUsersMapFull[i] && window.allUsersMapFull[i].role) || (d[i] && d[i].role);
        if (!window.isBoss() && (i === 'admin' || _r === 'admin')) continue; // ẩn Boss
        userList.push({ id: i, ...d[i] });
    }
    userList.sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (b.status === 'online' && a.status !== 'online') return 1;
        return (b.lastLogin || 0) - (a.lastLogin || 0); 
    });

    userList.forEach(u => {
        const i = u.id;
        let stHtml = u.status === 'online' 
            ? `<span style="background:rgba(76,175,80,0.1);color:#4CAF50;padding:5px 10px;border-radius:15px;font-weight:bold;border:1px solid rgba(76,175,80,0.4);font-size:11px;display:inline-flex;align-items:center;gap:5px;"><span style="width:8px;height:8px;background:#4CAF50;border-radius:50%;box-shadow:0 0 8px #4CAF50;animation:tiktok-pulse 1.5s infinite;"></span> ONLINE</span>`
            : `<span style="background:rgba(220,53,69,0.05);color:#dc3545;padding:5px 10px;border-radius:15px;font-weight:bold;border:1px solid rgba(220,53,69,0.2);font-size:11px;">🔴 OFFLINE</span>`;
        
        const realUser = (window.allUsersMap && window.allUsersMap[i]) ? window.allUsersMap[i] : {};
        let dName = realUser.name || u.name || i;
        let dRole = realUser.role || u.role || '-';
        if (i === 'admin') { dName = 'ANH QUÂN'; dRole = 'admin'; }

        let roleDisplay = dRole;
        if (dRole === 'hs') roleDisplay = 'Học sinh';
        else if (dRole === 'gv') roleDisplay = 'Giáo viên';
        else if (dRole === 'ql') roleDisplay = 'Quản lý';
        else if (dRole === 'admin') roleDisplay = window.isBoss() ? 'Boss 😎' : 'Quản lý';
        else if (dRole === 'cuu_hs') roleDisplay = 'Cựu HS';

        h += `<tr style="transition:0.3s;" onmouseover="this.style.background='var(--soft)'" onmouseout="this.style.background='transparent'">
            <td style="font-weight:bold; color:var(--pink); text-align:left; padding-left:15px;">${window.escapeHTML(dName)}</td>
            <td><span style="background:var(--card); padding:4px 8px; border-radius:10px; font-size:11px; border:1px solid var(--border); font-weight:bold;">${roleDisplay}</span></td>
            <td>${stHtml}</td>
            <td style="font-size:12px; font-weight:bold;">${fmtDate(u.lastLogin)}</td>
            <td style="font-size:12px; color:var(--text-light);">${fmtDate(u.lastLogout)}</td>
        </tr>`; 
    });

    const tb = document.getElementById('tracking-body'); 
    if (tb) tb.innerHTML = h || '<tr><td colspan="5" style="text-align:center; padding:20px;">Chưa có dữ liệu hoạt động.</td></tr>'; 
};

// 3. HÀM CHÍNH: TẢI TOÀN BỘ THEO DÕI (GỒM CẢ ONLINE, LỊCH SỬ ĐIỂM, HỘP THƯ SOS)
window.loadTracking = () => { 
    if (!window.db || !window.session || !window.isAdminLevel()) return;

    // --- TỰ ĐỘNG CHÈN NÚT LÀM MỚI BÊN CẠNH TIÊU ĐỀ ---
    const trackTab = document.getElementById('tab-tracking');
    if (trackTab && !document.getElementById('btn-refresh-track')) {
        const title = trackTab.querySelector('h3.title-pink');
        if (title) {
            title.style.display = 'flex';
            title.style.justifyContent = 'space-between';
            title.style.alignItems = 'center';
            const btn = document.createElement('button');
            btn.id = 'btn-refresh-track';
            btn.className = 'btn-royal';
            btn.style.width = 'auto';
            btn.style.padding = '8px 15px';
            btn.style.fontSize = '12px';
            btn.style.background = '#1877F2';
            btn.style.boxShadow = '0 4px 10px rgba(24, 119, 242, 0.3)';
            btn.innerHTML = '🔄 LÀM MỚI';
            btn.onclick = window.refreshTracking;
            title.appendChild(btn);
        }
    }

    // --- PHẦN 1: THEO DÕI ONLINE/OFFLINE ---
    window.db.ref('tracking').on('value', s => { 
        window.renderTrackingTable(s);
    }); 

    // --- PHẦN 2: TẢI LỊCH SỬ SỬA ĐIỂM ---
    const titleLogs = document.getElementById('title-grade-logs');
    const cardLogs = document.getElementById('card-grade-logs');
    if (titleLogs) titleLogs.style.display = 'flex'; 
    if (cardLogs) cardLogs.style.display = 'block';

    window.db.ref('grade_logs').limitToLast(50).on('value', snap => {
        let html = ''; let logs = [];
        snap.forEach(child => { logs.push(child.val()); });
        logs.reverse(); 

        logs.forEach(log => {
            const dt = new Date(log.time);
            const pad = num => num < 10 ? '0' + num : num;
            const timeStr = `${pad(dt.getHours())}:${pad(dt.getMinutes())} ${pad(dt.getDate())}/${pad(dt.getMonth()+1)}`;
            const targetId = log.target_id || log.studentId || '';
            let targetName = log.target_name
                || (window.allUsersMap && window.allUsersMap[targetId] && window.allUsersMap[targetId].name)
                || (targetId ? targetId.toUpperCase() : 'KHÔNG RÕ');
            const byName = log.by_name || log.editorName || 'Admin';
            const termRaw = (log.term || '').toString().replace(/^hk/i, '') || '?';

            html += `<tr>
                <td>${timeStr}</td>
                <td style="color:#9C27B0; font-weight:bold;">${window.escapeHTML(byName)}</td>
                <td style="color:var(--pink); font-weight:bold;">${window.escapeHTML(targetName)}${targetId ? ` <span style="opacity:.6;font-size:11px;">(${window.escapeHTML(targetId)})</span>` : ''}</td>
                <td><span style="background:var(--card); padding:2px 8px; border-radius:10px; border:1px solid var(--border);">HK ${termRaw}</span></td>
            </tr>`;
        });
        const tbody = document.getElementById('grade-logs-body');
        if (tbody) tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:20px;">Chưa có lịch sử sửa điểm nào.</td></tr>';
    });
    
    // --- PHẦN 3: TẢI HỘP THƯ YÊU CẦU HỖ TRỢ SOS ---
    window.db.ref('inbox').off('value'); 
    window.db.ref('inbox').on('value', snap => {
        let html = ''; const data = snap.val() || {}; let hasReq = false;
        const reqArray = [];
        for (let k in data) reqArray.push({ key: k, ...data[k] });
        reqArray.sort((a, b) => b.time - a.time);
        
        reqArray.forEach(req => { 
            hasReq = true; 
            const dt = new Date(req.time); 
            const pad = num => num < 10 ? '0' + num : num;
            const timeStr = pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ' ' + pad(dt.getDate()) + '/' + pad(dt.getMonth()+1);
            
            const safeReq = window.escapeHTML(req.req);
            const safeSecret = window.escapeHTML(req.secret);
            const lyDoStr = safeReq === 'em xin LẠI-id' ? 'QUÊN ID ĐĂNG NHẬP' : 'QUÊN MẬT KHẨU';

            let mapHtml = '';
            if (req.lat && req.lng) {
                const mapLink = `https://www.google.com/maps?q=${req.lat},${req.lng}`;
                mapHtml = `<br><b style="color:#4CAF50;">📍 Vị trí:</b> <a href="${mapLink}" target="_blank" style="color:#4CAF50; font-weight:bold; text-decoration:underline; font-size:13px;">🗺️ Mở Bản Đồ</a>`;
            } else {
                const errorLog = req.gpsError ? ` (Lỗi: ${req.gpsError})` : '';
                mapHtml = `<br><b style="color:#dc3545;">📍 Vị trí:</b> <span style="font-size:12px; color:#dc3545; font-style:italic;">Không lấy được GPS${errorLog}</span>`;
            }

            const shortDevice = typeof getShortDevice === 'function' ? getShortDevice(req.device) : "Không rõ";
            const safeDevice = window.escapeHTML(shortDevice);
            const devHtml = safeDevice ? `<br><b style="color:#888;">📱 Máy:</b> <span style="font-size:12px; color:#888; font-weight:bold;">${safeDevice}</span>` : '';

            html += `<div style="background:var(--bg); padding:15px; border-radius:10px; border-left:4px solid #FF9800; border:1px solid var(--border); margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><b style="color:var(--pink);">${window.escapeHTML(req.name)}</b> <small style="color:var(--text-light); font-weight:bold;">${timeStr}</small></div>
                <div style="font-size:13px; word-break: break-word;">
                    <b>Vấn đề:</b> <span style="color:#dc3545; font-weight:bold;">${lyDoStr}</span><br>
                    <b>Mã tra cứu:</b> ${safeSecret}
                    ${mapHtml}
                    ${devHtml}
                </div>
                <button class="btn-royal" style="background:#FF9800; margin-top:10px; padding:10px; font-size:12px;" onclick="window.replySupport('${req.key}', '${window.escapeHTML(req.name)}', '${safeSecret}')">✍️ SOẠN PHẢN HỒI</button>
            </div>`; 
        });
        const inboxEl = document.getElementById('admin-inbox-list'); 
        if (inboxEl) inboxEl.innerHTML = hasReq ? html : '<div style="text-align:center; color:var(--text-light); padding:20px;">📭 Không có yêu cầu hỗ trợ nào.</div>';
    });
};
// ==========================================
// HỆ THỐNG ĐIỂM DANH TUẦN BẤT TẬN (BẢN V3.0 - CÓ CÓ PHÉP, THỐNG KÊ & QUÉT QR)
// ==========================================

// 1. TẢI DANH SÁCH CÁC TUẦN
window.loadAttendanceSessions = () => {
    if (!window.session || (!window.isAdminLevel() && window.session.role !== 'gv')) return;
    const btnAdd = document.getElementById('btn-add-week');
    if (btnAdd) btnAdd.classList.remove('hidden');

    window.db.ref('attendance_weeks').on('value', snap => {
        const weeks = snap.val() || {};
        let html = '', arr = [];
        for(let id in weeks) arr.push({ id, ...weeks[id] });
        arr.sort((a, b) => a.time - b.time);

        arr.forEach(w => {
            const isLocked = w.isLocked;
            const statusColor = isLocked ? '#4CAF50' : '#FF9800'; 
            const statusText = isLocked ? '✅ Đã Chốt' : '⏳ Đang Mở';
            const activeClass = window.currentAttSession === w.id ? `box-shadow: 0 0 0 3px ${statusColor}50; transform: scale(1.05);` : '';
            
            html += `<div class="card shadow-lux flex-center" onclick="window.openAttendanceWeek('${w.id}', '${w.name}')" style="padding:15px 5px; cursor:pointer; min-height:85px; text-align:center; transition:0.3s; border-top: 4px solid ${statusColor}; ${activeClass}">
                    <b style="font-size:13px; color:var(--text);">${window.escapeHTML(w.name).toUpperCase()}</b>
                    <small style="font-size:11px; color:var(--text-light); margin: 4px 0;">${w.date}</small>
                    <span style="font-size:10px; font-weight:bold; color:${statusColor}; background:${statusColor}20; padding:4px 8px; border-radius:10px;">${statusText}</span>
                </div>`;
        });
        const listEl = document.getElementById('attendance-week-list');
        if (listEl) listEl.innerHTML = html || '<p style="grid-column:1/-1; text-align:center; color:#888;">Bấm <b>➕ THÊM TUẦN</b> để bắt đầu!</p>';
    });
};

// 2. MỞ BẢNG TẠO TUẦN MỚI GIAO DIỆN XỊN
window.createNewWeek = () => {
    window.db.ref('attendance_weeks').once('value').then(snap => {
        const nextNum = snap.numChildren() + 1;
        const input = document.getElementById('new-week-name-input');
        if (input) input.value = "Tuần " + nextNum; // Tự động gợi ý tên Tuần tiếp theo
        window.toggleModal('create-week-modal', true);
    });
};

// 2.5. XÁC NHẬN TẠO TUẦN VÀ LƯU VÀO FIREBASE
window.confirmCreateWeek = () => {
    const input = document.getElementById('new-week-name-input');
    const name = input ? input.value.trim() : '';
    
    if (!name) return window.showCustomAlert("THIẾU THÔNG TIN", "chưa nhập tên tuần học kìa!", "⚠️");

    const btn = document.querySelector('#create-week-modal .btn-royal');
    const oldText = btn.innerText;
    btn.innerText = "⏳ ĐANG TẠO...";
    btn.disabled = true;

    const now = new Date(window.now());
    const dateStr = now.getDate() + '/' + (now.getMonth() + 1);
    const weekId = 'week_' + Date.now();

    window.db.ref('attendance_weeks/' + weekId).set({
        name: name, 
        date: dateStr, 
        time: window.now(), 
        isLocked: false
    }).then(() => {
        if(typeof window.showToast === 'function') window.showToast("✅ Đã tạo " + name);
        window.toggleModal('create-week-modal', false);
        window.openAttendanceWeek(weekId, name);
    }).catch(err => {
        window.showCustomAlert("LỖI HỆ THỐNG", err.message, "❌");
    }).finally(() => {
        btn.innerText = oldText;
        btn.disabled = false;
    });
};

// 3. XEM CHI TIẾT (TÍCH HỢP NÚT VÀNG NGHỈ CÓ PHÉP)
window.openAttendanceWeek = (id, name) => {
    window.currentAttSession = id;
    document.getElementById('attendance-detail-zone').classList.remove('hidden');
    window.loadAttendanceSessions(); 

    window.db.ref('attendance_weeks/' + id).on('value', s => {
        const info = s.val();
        if(!info) return;
        window.isAttSessionLocked = info.isLocked || false;
        const btnLock = document.getElementById('btn-lock-session');
        const btnDel = document.getElementById('btn-delete-session');

        if (btnLock) {
            btnLock.classList.remove('hidden');
            btnLock.innerHTML = window.isAttSessionLocked ? (window.isAdminLevel() ? "🔓 MỞ KHÓA" : "🔒 ĐÃ CHỐT") : "🔒 CHỐT SỔ";
            btnLock.style.background = window.isAttSessionLocked ? (window.isAdminLevel() ? "#4CAF50" : "#888") : "#FF9800";
        }
        if (btnDel) {
            if (window.isAdminLevel() || (!window.isAttSessionLocked && window.session.role === 'gv')) btnDel.classList.remove('hidden');
            else btnDel.classList.add('hidden'); 
        }
    });

    window.db.ref('attendance_data/' + id).on('value', sData => {
        const data = sData.val() || {};
        window.db.ref('users').once('value').then(sUsers => {
            const users = sUsers.val() || {};
            let hsList = [];
            for (let uid in users) if (users[uid].role === 'hs') hsList.push({ id: uid, name: users[uid].name, status: data[uid] });
            
            let total = hsList.length, marked = 0;
            window.currentUnmarkedNames = []; 

            hsList.forEach(hs => { 
                if (hs.status) marked++; else window.currentUnmarkedNames.push(hs.name);
            });

            hsList.sort((a, b) => a.name.localeCompare(b.name));

            let html = '';
            hsList.forEach(hs => {
                let stTxt = '<span style="color:#888; font-size:13px; font-weight:bold;"><i class="fas fa-minus-circle"></i> CHƯA ĐIỂM DANH</span>';
                let bgRow = '';

                if (hs.status === 'co_mat') { 
                    stTxt = '<span style="color:#4CAF50; font-size:14px; font-weight:bold;"><i class="fas fa-check-circle"></i> CÓ MẶT</span>'; 
                    bgRow = 'background: rgba(76,175,80,0.1); border-left: 5px solid #4CAF50;'; 
                } else if (hs.status === 'nghi_phep') { 
                    stTxt = '<span style="color:#FF9800; font-size:14px; font-weight:bold;"><i class="fas fa-exclamation-circle"></i> CÓ PHÉP</span>'; 
                    bgRow = 'background: rgba(255,152,0,0.1); border-left: 5px solid #FF9800;'; 
                } else if (hs.status === 'nghi') { 
                    stTxt = '<span style="color:#dc3545; font-size:14px; font-weight:bold;"><i class="fas fa-times-circle"></i> KHÔNG PHÉP</span>'; 
                    bgRow = 'background: rgba(220,53,69,0.1); border-left: 5px solid #dc3545;'; 
                }

                html += `<tr onclick="window.openMarkMenu('${hs.id}', '${window.escapeHTML(hs.name)}')" style="cursor:pointer; ${bgRow} transition:all 0.3s ease;">
                    <td colspan="2" style="padding: 15px; border-bottom: 1px solid var(--border);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="text-align: left;">
                                <b style="font-size: 16px; color: var(--pink);">${window.escapeHTML(hs.name)}</b>
                                <div style="margin-top: 6px;">${stTxt}</div>
                            </div><div style="font-size:18px; color:#ccc;"><i class="fas fa-chevron-right"></i></div>
                        </div></td></tr>`;
            });
            document.getElementById('attendance-body').innerHTML = html;

            const titleEl = document.getElementById('att-current-week-title');
            if (titleEl) {
                let progColor = (marked === total && total > 0) ? '#4CAF50' : '#FF9800';
                titleEl.innerHTML = `ĐANG XEM: ${window.escapeHTML(name).toUpperCase()} <br>
                    <span style="font-size:12px; color:${progColor}; background:${progColor}20; padding:4px 12px; border-radius:12px; display:inline-block; margin-top:8px; border:1px solid ${progColor}50; font-weight:bold;">
                        Tiến độ: ${marked} / ${total}
                    </span>`;
            }
        });
    });
};

window.openMarkMenu = (uid, name) => {
    if (window.isAttSessionLocked && !window.isAdminLevel()) {
        return window.showCustomAlert("BẢNG ĐÃ KHÓA 🔒", "Tuần này đã niêm phong. Vui lòng báo Boss để sửa!", "🚫");
    }
    window.currentAttTarget = uid;
    document.getElementById('att-target-name').innerText = name + " (" + uid.toUpperCase() + ")";
    window.toggleModal('attendance-action-modal', true);
};

window.saveAttendance = (status) => {
    const sid = window.currentAttSession;
    const uid = window.currentAttTarget;
    if (!sid || !uid) return;
    const nameDisp = document.getElementById('att-target-name');
    nameDisp.innerText = "⏳ Đang đồng bộ...";

    const ref = window.db.ref(`attendance_data/${sid}/${uid}`);
    ((status === 'clear') ? ref.remove() : ref.set(status)).then(() => {
        window.toggleModal('attendance-action-modal', false);
        if(typeof window.showToast === 'function') window.showToast("✅ Đã lưu trạng thái!");
    }).catch(err => {
        window.toggleModal('attendance-action-modal', false);
        window.showCustomAlert("🚨 LỖI FIREBASE: " + err.message);
    });
};


// ==========================================
// 5. CHỐT / MỞ KHÓA (BẢN GIAO DIỆN XỊN CHỐNG HACK)
// ==========================================
window.toggleSessionLock = () => {
    if (window.isAttSessionLocked && !window.isAdminLevel()) {
        return window.showCustomAlert("KHÔNG CÓ QUYỀN 🔒", "Chỉ Boss tối cao mới có chìa khóa mở bảng này!", "🚨");
    }

    const sid = window.currentAttSession;
    if (!sid) return;

    const newStatus = !window.isAttSessionLocked;

    if (newStatus && window.currentUnmarkedNames && window.currentUnmarkedNames.length > 0) {
        let len = window.currentUnmarkedNames.length;
        window.showCustomConfirm("⚠️ PHÁT HIỆN BỎ SÓT", `Còn ${len} học sinh CHƯA điểm danh. Bạn có chắc chắn muốn bỏ qua và CHỐT SỔ luôn không?`, () => {
            window.db.ref('attendance_weeks/' + sid).update({ isLocked: true }).then(() => {
                if(typeof window.showToast === 'function') window.showToast("🔒 Đã chốt sổ thành công!");
            });
        });
        return; 
    }

    const title = newStatus ? "🔒 CHỐT SỔ" : "🔓 MỞ KHÓA";
    const msg = newStatus ? "Tuyệt vời! Đã điểm danh đủ. Bạn muốn NIÊM PHONG tuần này chứ?" : "Xác nhận MỞ KHÓA để giáo viên có thể sửa đổi dữ liệu?";
    window.showCustomConfirm(title, msg, () => {
        window.db.ref('attendance_weeks/' + sid).update({ isLocked: newStatus }).then(() => {
            if(typeof window.showToast === 'function') window.showToast(newStatus ? "🔒 Đã chốt sổ!" : "🔓 Đã mở khóa!");
        });
    });
};

window.deleteCurrentWeek = () => {
    const sid = window.currentAttSession;
    if (!sid) return;

    if (window.isAttSessionLocked && !window.isAdminLevel()) {
        return window.showCustomAlert("CẢNH BÁO BẢO MẬT 🔒", "Bảng đã khóa, chỉ Boss mới được quyền xóa!", "🚨");
    }

    window.showCustomConfirm("🗑️ XÓA TUẦN HỌC", "Bạn có chắc chắn muốn XÓA TOÀN BỘ điểm danh của tuần này? Hành động này không thể khôi phục!", () => {
        window.db.ref('attendance_data/' + sid).remove();
        window.db.ref('attendance_weeks/' + sid).remove().then(() => {
            document.getElementById('attendance-detail-zone').classList.add('hidden');
            window.currentAttSession = null;
            if(typeof window.showToast === 'function') window.showToast("✅ Đã xóa tuần học!");
        });
    });
};

// ==========================================
// TÍNH NĂNG 2: THỐNG KÊ (BẢN NÂNG CẤP THẺ BÁO CÁO)
// ==========================================
window.openAttendanceStats = () => {
    window.toggleModal('attendance-stats-modal', true);
    document.getElementById('att-stats-body').innerHTML = '<div style="text-align:center; padding:20px; color:#888;">⏳ Đang thu thập dữ liệu...</div>';
    
    window.db.ref('users').once('value').then(sUsers => {
        const users = sUsers.val() || {};
        let hsStats = {};
        for (let uid in users) if (users[uid].role === 'hs') hsStats[uid] = { name: users[uid].name, uid: uid, cm: 0, cp: 0, kp: 0 };
        
        window.db.ref('attendance_data').once('value').then(sData => {
            const allWeeks = sData.val() || {};
            for (let weekId in allWeeks) {
                for (let uid in allWeeks[weekId]) {
                    if (hsStats[uid]) {
                        if (allWeeks[weekId][uid] === 'co_mat') hsStats[uid].cm++;
                        if (allWeeks[weekId][uid] === 'nghi_phep') hsStats[uid].cp++;
                        if (allWeeks[weekId][uid] === 'nghi') hsStats[uid].kp++;
                    }
                }
            }
            
            let arr = Object.values(hsStats);
            // Sắp xếp: Đứa nào cúp học nhiều bị tóm lên đầu bảng
            arr.sort((a, b) => b.kp - a.kp || b.cp - a.cp || a.name.localeCompare(b.name)); 
            
            let html = '';
            arr.forEach(hs => {
                let total = hs.cm + hs.cp + hs.kp;
                // Tính % đi học (Nếu chưa có dữ liệu thì mặc định 0%)
                let percent = total === 0 ? 0 : Math.round((hs.cm / total) * 100);
                
                let warningBorder = hs.kp >= 3 ? 'border-left: 5px solid #dc3545;' : 'border-left: 5px solid #4CAF50;';
                let warningBadge = hs.kp >= 3 ? '<span style="color:#dc3545; font-size:10px; font-weight:bold; background:rgba(220,53,69,0.1); padding:4px 8px; border-radius:10px;">⚠️ CẢNH CÁO</span>' : '<span style="color:#4CAF50; font-size:10px; font-weight:bold; background:rgba(76,175,80,0.1); padding:4px 8px; border-radius:10px;">✨ TỐT</span>';
                
                html += `
                <div class="card shadow-lux" style="padding:15px; margin-bottom:0; text-align:left; background:var(--card); ${warningBorder} border-radius:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div>
                            <b style="font-size:16px; color:var(--pink);">${window.escapeHTML(hs.name)}</b>
                            <div style="font-size:11px; color:var(--text-light); margin-top:2px;">ID: ${hs.uid.toUpperCase()}</div>
                        </div>
                        <div>${warningBadge}</div>
                    </div>
                    
                    <div style="background:var(--border); width:100%; height:6px; border-radius:3px; overflow:hidden; margin-bottom:12px;">
                        <div style="width:${percent}%; background:${hs.kp >= 3 ? '#dc3545' : '#4CAF50'}; height:100%; transition:1s;"></div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:bold; text-align:center;">
                        <div style="flex:1; background:rgba(76,175,80,0.05); padding:8px 5px; border-radius:10px;"><div style="color:#4CAF50; font-size:18px; margin-bottom:3px;">${hs.cm}</div>CÓ MẶT</div>
                        <div style="flex:1; background:rgba(255,152,0,0.05); padding:8px 5px; border-radius:10px; margin:0 5px;"><div style="color:#FF9800; font-size:18px; margin-bottom:3px;">${hs.cp}</div>CÓ PHÉP</div>
                        <div style="flex:1; background:rgba(220,53,69,0.05); padding:8px 5px; border-radius:10px;"><div style="color:#dc3545; font-size:18px; margin-bottom:3px;">${hs.kp}</div>KHÔNG PHÉP</div>
                    </div>
                </div>`;
            });
            
            document.getElementById('att-stats-body').innerHTML = html || '<div style="text-align:center; color:#888;">Chưa có dữ liệu học sinh.</div>';
        });
    });
};
// ==========================================
// TÍNH NĂNG 4: MÁY QUÉT QR CODE ĐIỂM DANH (BẢN VÁ LỖI XUYÊN KHÔNG)
// ==========================================
window.openQRScanner = () => {
    if (window.isAttSessionLocked && !window.isAdminLevel()) {
        return window.showCustomAlert("BẢNG ĐÃ KHÓA 🔒", "Tuần này đã niêm phong. Không thể quét thêm mã!", "🚫");
    }
    
    window.toggleModal('qr-scanner-modal', true);
    
    if(window.html5QrcodeScanner) window.html5QrcodeScanner.clear(); 
    window.html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: {width: 250, height: 250} });
    
    window.html5QrcodeScanner.render((decodedText) => {
        const sid = window.currentAttSession;
        if(!sid) return;

        if (window.isAttSessionLocked && !window.isAdminLevel()) {
            window.closeQRScanner();
            return window.showCustomAlert("BẢNG ĐÃ CHỐT 🔒", "Bảng đã khóa, máy quét tự động ngắt!", "🚫");
        }
        
        let uid = decodedText.toLowerCase().trim();
        if (uid.includes('user=')) uid = uid.split('user=')[1].split('&')[0];
        
        window.db.ref(`attendance_data/${sid}/${uid}`).set('co_mat').then(() => {
            if(typeof window.showToast === 'function') window.showToast("🟢 Đã quét: " + uid.toUpperCase());
            new Audio('https://www.soundjay.com/buttons/beep-07.wav').play().catch(()=>{});
        });
    }, (err) => { });
};

window.closeQRScanner = () => {
    if(window.html5QrcodeScanner) window.html5QrcodeScanner.clear();
    window.toggleModal('qr-scanner-modal', false);
};
// =======================================================
// BẢN VÁ KHỚP HOÀN TOÀN VỚI HTML: rules-input & announce-target
// =======================================================
window.saveAnnouncement = () => {
    // 1. Nhắm trúng đích 2 ô dữ liệu theo đúng HTML của bạn
    const inputEl = document.getElementById('rules-input');
    const targetEl = document.getElementById('announce-target');
    
    // Kiểm tra an toàn bảo vệ hệ thống
    if (!inputEl) {
        return window.showCustomAlert("LỖI HỆ THỐNG 🚨", "Không tìm thấy ô nhập dữ liệu có id='rules-input'!", "❌");
    }
    
    // Lấy nội dung chữ và xóa khoảng trắng thừa
    const content = inputEl.value.trim();
    
    // 2. Bắt lỗi bỏ trống nội dung
    if (!content) {
        return window.showCustomAlert("NHẮC NHỞ ⚠️", "Vui lòng nhập nội dung thông báo trước khi ấn ĐĂNG!", "✏️");
    }
    
    // 3. Kiểm tra kết nối dữ liệu Firebase
    if (!window.db) {
        return window.showCustomAlert("LỖI KẾT NỐI 🚨", "Hệ thống cơ sở dữ liệu chưa sẵn sàng kết nối!", "❌");
    }
    
    // Đọc đối tượng nhận thông báo (all: Tất cả / hs: Học sinh / gv: Giáo viên)
    const targetGroup = targetEl ? targetEl.value : "all";
    
    // Tính toán thời gian thực tế
    const timestamp = typeof window.now === 'function' ? window.now() : new Date().getTime();
    
    // 4. Tiến hành đẩy dữ liệu lên Firebase Realtime Database
    window.db.ref('announcements').push().set({
        content: content,
        target: targetGroup, // Lưu thêm nhóm nhận thông báo cực kỳ tiện lợi
        timestamp: timestamp,
        sender: window.session?.name || "Ban Quản Trị",
        role: window.session?.role || "admin"
    }).then(() => {
        // Xóa sạch chữ trong ô nhập sau khi lưu thành công để sẵn sàng nhập bài mới
        inputEl.value = ""; 
        
        // Hiển thị thông báo thành công đẹp mắt
        if (typeof window.showToast === 'function') {
            window.showToast("🚀 Đã đăng và đồng bộ thông báo thành công!");
        } else {
            window.showCustomAlert("THÀNH CÔNG 🎉", "Thông báo mới đã được gửi lên hệ thống lớp học!", "✅");
        }
    }).catch((error) => {
        window.showCustomAlert("LỖI LƯU DỮ LIỆU 🚨", "Không thể gửi dữ liệu lên Firebase: " + error.message, "❌");
    });
};
// =========================================================
// BẢN VÁ: ĐỊNH NGHĨA HÀM TÌM KIẾM KẾT NỐI THÀNH VIÊN
// =========================================================
window.searchConnectUser = () => {
    // 1. Lấy ô nhập ID bạn bè
    const inputEl = document.getElementById('connect-search-id');
    if (!inputEl) return;
    
    const uid = inputEl.value.trim().toLowerCase();
    
    // 2. Kiểm tra dữ liệu đầu vào
    if (!uid) {
        return window.showCustomAlert("THIẾU ID ⚠️", "Vui lòng nhập ID bạn bè trước khi tìm kiếm!", "✏️");
    }
    
    // 3. Kiểm tra trạng thái kết nối Firebase
    if (!window.db) {
        return window.showCustomAlert("LỖI KẾT NỐI 🚨", "Hệ thống cơ sở dữ liệu chưa sẵn sàng!", "❌");
    }
    
    // 4. Truy vấn lên Firebase Realtime Database để kiểm tra ID thành viên
    window.db.ref('users/' + uid).once('value').then(snapshot => {
        if (snapshot.exists()) {
            // Nếu tìm thấy người dùng, tiến hành mở Hồ sơ cá nhân của họ
            if (typeof window.openUserProfile === 'function') {
                window.openUserProfile(uid);
            } else {
                window.showCustomAlert("HỆ THỐNG LỖI 🚨", "Hàm xem hồ sơ cá nhân (openUserProfile) chưa được định nghĩa!", "⚙️");
            }
        } else {
            // Nếu không tồn tại ID này trong nhánh 'users'
            window.showCustomAlert("KHÔNG TÌM THẤY ❌", "Không tìm thấy thành viên nào có ID: " + uid.toUpperCase(), "🔍");
        }
    }).catch(err => {
        window.showCustomAlert("LỖI ĐỌC DỮ LIỆU 🚨", err.message, "❌");
    });
};
// =========================================================================
// BẢN VÁ LÕI NÂNG CẤP: TÀNG HÌNH TOÀN DIỆN (CHAT, NHÓM & TRUNG TÂM GIÁM SÁT)
// =========================================================================
(() => {
    // Đợi hệ thống chuẩn bị vào ứng dụng để cài bộ chặn ngầm
    if (typeof window.enterApp === 'function') {
        const originalEnterApp = window.enterApp;
        
        window.enterApp = function() {
            // Kiểm tra kết nối Firebase Realtime Database
            if (window.db && !window.db.ref.isPatched) {
                const originalRef = window.db.ref;
                
                // Kích hoạt bộ đánh chặn thông minh trên tất cả các đường dẫn dữ liệu
                window.db.ref = function(path) {
                    const actualRef = originalRef.apply(this, arguments);
                    if (!path) return actualRef;
                    
                    // Tạo một lớp bảo vệ bọc quanh Reference gốc của Firebase
                    const protectedRef = Object.create(actualRef);
                    
                    // Hàm xử lý chặn và tàng hình dữ liệu khi Admin bật Coi Trộm
                    const createSpyInterceptor = (methodName, originalMethod) => {
                        return function() {
                            // Chỉ kích hoạt khi chế độ Coi Trộm đang BẬT (window.isSpying === true)
                            if (window.isSpying) {
                                const lowerPath = path.toLowerCase();
                                
                                if (
                                    lowerPath.includes('typing/') ||       // Chặn báo trạng thái "đang gõ chữ..."
                                    lowerPath.includes('unread/') ||       // Chặn lệnh xóa chữ "Chưa đọc" nhóm và cá nhân
                                    lowerPath.includes('chat_streaks/') || // Chặn cập nhật chuỗi ngày nhắn tin liên tục
                                    lowerPath.includes('tracking/')        // 🚨 CHẶN ĐẨY ĐỊNH VỊ & TRẠNG THÁI LÊN TRUNG TÂM GIÁM SÁT
                                ) {
                                    console.log(`🕵️ [Spy Mode - Giám Sát] Đã chặn gửi vị trí/dấu vết tại nhánh: ${path}`);
                                    return Promise.resolve(); // Trả về thành công giả lập để app chạy mượt, không gây treo app
                                }
                            }
                            // Nếu tắt coi trộm, hệ thống cập nhật định vị và trạng thái như bình thường
                            return originalMethod.apply(actualRef, arguments);
                        };
                    };
                    
                    // Ghi đè 3 phương thức cập nhật dữ liệu lên Firebase
                    protectedRef.set = createSpyInterceptor('set', actualRef.set);
                    protectedRef.update = createSpyInterceptor('update', actualRef.update);
                    protectedRef.remove = createSpyInterceptor('remove', actualRef.remove);
                    
                    return protectedRef;
                };
                
                window.db.ref.isPatched = true;
                console.log("🚀 LỚP HỌC CÔNG GIÁO: Đã tích hợp Tàng hình Trung tâm giám sát thành công!");
            }
            
            // Tiếp tục chạy hàm vào app gốc
            return originalEnterApp.apply(this, arguments);
        };
    }
})();
// Tự động kiểm tra trạng thái đồng ý nội quy khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    const isAgreed = localStorage.getItem('rulesAgreed');
    const chk = document.getElementById('agree-rules');
    if (chk && isAgreed === 'true') {
        chk.checked = true;
    }
});
// =======================================================
// MODULE: TRỢ LÝ AI GIÁO LÝ - CHỈ KÍCH HOẠT SAU KHI ĐĂNG NHẬP
// =======================================================
(function() {
    // 1. Cấu hình: gọi THẲNG Google Gemini API.
    //    API key KHÔNG hard-code trong file này — được lưu trên Firebase
    //    Realtime Database tại đường dẫn: config/gemini_api_key
    //    Boss chỉ cần vào Firebase Console -> Realtime DB -> tạo node:
    //        config: { gemini_api_key: "AIza...KEY_CỦA_BẠN" }
    //    Muốn đổi/thu hồi key thì sửa/xóa trên Firebase, code không cần build lại.
    const GEMINI_KEY_REF_PATH = "config/gemini_api_key";
    const MODEL_NAME = "gemini-2.5-flash";
    const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

    // Cache key trong RAM để đỡ đọc Firebase mỗi lần chat
    let _cachedGeminiKey = null;
    async function layGeminiKeyTừFirebase() {
        if (_cachedGeminiKey) return _cachedGeminiKey;
        if (!window.db || !window.db.ref) {
            throw new Error("Firebase chưa sẵn sàng");
        }
        const snap = await window.db.ref(GEMINI_KEY_REF_PATH).once("value");
        const key = snap && snap.val();
        if (!key || typeof key !== "string") {
            throw new Error("Chưa cấu hình API key trên Firebase (" + GEMINI_KEY_REF_PATH + ")");
        }
        _cachedGeminiKey = key;
        return key;
    }

    let aiChatHistory = [];

    function getAppUserName() {
        if (window.session && window.session.name) {
            return window.session.name; 
        }
        return "bạn";
    }

    // 2. Hàm khởi tạo giao diện và logic Chat (Chỉ gọi khi đã đăng nhập)
    function khởiTạoTrợLýAI() {
        // Kiểm tra xem nếu giao diện đã tồn tại thì không tạo trùng nữa
        if (document.getElementById('gemini-ai-assistant')) return;

        const aiWidgetContainer = document.createElement('div');
        aiWidgetContainer.id = 'gemini-ai-assistant';
        aiWidgetContainer.innerHTML = `
            <div id="gemini-bubble-toggle" style="position:fixed; bottom:20px; right:20px; width:55px; height:55px; background:var(--pink); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:22px; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.3); z-index:999999; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <i class="fas fa-robot"></i>
            </div>

            <div id="gemini-chat-window" class="hidden" style="position:fixed; bottom:85px; right:20px; width:340px; max-width:calc(100vw - 40px); height:460px; max-height:calc(100dvh - 110px); background:var(--card); border:1px solid var(--border); border-radius:20px; display:flex; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,0.25); z-index:999999; overflow:hidden; font-family:inherit;">
                
                <div style="background:var(--pink); color:white; padding:15px; display:flex; align-items:center; justify-content:space-between; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; gap:8px; font-size:14px; letter-spacing:0.5px;">
                        <i class="fas fa-circle" style="color:#4CAF50; font-size:9px; animation: aiBlink 1.5s infinite;"></i>
                        <span>TRỢ LÝ AI GIÁO LÝ</span>
                    </div>
                    <button id="gemini-close-window" style="background:none; border:none; color:white; font-size:18px; cursor:pointer; padding:0 5px;">&#10005;</button>
                </div>
                
                <div id="gemini-msg-body" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; background:var(--bg);">
                    <div style="align-self:flex-start; background:var(--soft); color:var(--text); padding:10px 14px; border-radius:15px 15px 15px 5px; max-width:85%; font-size:13.5px; line-height:1.5; border-left:3px solid var(--pink);">
                        Chào <b>${getAppUserName()}</b>! Mình là trợ lý trí tuệ nhân tạo được tích hợp riêng cho <b>Lớp Học Công Giáo</b>. Bạn có câu hỏi nào về bài học, Kinh Thánh hay Giáo lý cần mình hỗ trợ giải đáp không? 😊
                    </div>
                </div>

                <div style="padding:10px; background:var(--card); border-top:1px solid var(--border); display:flex; gap:8px; align-items:center;">
                    <input type="text" id="gemini-input-text" placeholder="Hỏi AI điều gì đó..." style="flex:1; padding:10px 15px; border:1px solid var(--border); border-radius:20px; background:var(--bg); color:var(--text); outline:none; font-size:13.5px;">
                    <button id="gemini-btn-send" style="background:var(--pink); border:none; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s;">
                        <i class="fas fa-paper-plane" style="font-size:13px;"></i>
                    </button>
                </div>
            </div>

            <style>
                @keyframes aiBlink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                #gemini-bubble-toggle:hover { transform: scale(1.08); }
                #gemini-btn-send:active { transform: scale(0.9); }
            </style>
        `;
        document.body.appendChild(aiWidgetContainer);

        // Khai báo điều khiển UI
        const bubbleBtn = document.getElementById('gemini-bubble-toggle');
        const chatBox = document.getElementById('gemini-chat-window');
        const closeBtn = document.getElementById('gemini-close-window');
        const inputField = document.getElementById('gemini-input-text');
        const sendBtn = document.getElementById('gemini-btn-send');
        const msgBody = document.getElementById('gemini-msg-body');

        bubbleBtn.addEventListener('click', () => {
            chatBox.classList.toggle('hidden');
            if(!chatBox.classList.contains('hidden')) {
                inputField.focus();
                msgBody.scrollTop = msgBody.scrollHeight;
            }
        });

        closeBtn.addEventListener('click', () => {
            chatBox.classList.add('hidden');
        });

        function pushMessageToScreen(text, isUser = false) {
            const wrapper = document.createElement('div');
            wrapper.style.maxWidth = '85%';
            wrapper.style.fontSize = '13.5px';
            wrapper.style.lineHeight = '1.5';
            wrapper.style.padding = '10px 14px';
            
            if (isUser) {
                wrapper.style.alignSelf = 'flex-end';
                wrapper.style.background = 'var(--pink)';
                wrapper.style.color = 'white';
                wrapper.style.borderRadius = '15px 15px 5px 15px';
                wrapper.innerText = text;
            } else {
                wrapper.style.alignSelf = 'flex-start';
                wrapper.style.background = 'var(--soft)';
                wrapper.style.color = 'var(--text)';
                wrapper.style.borderRadius = '15px 15px 15px 5px';
                wrapper.style.borderLeft = '3px solid var(--pink)';
                wrapper.innerHTML = text.replace(/\n/g, '<br>');
            }
            
            msgBody.appendChild(wrapper);
            if (isUser) {
                msgBody.scrollTop = msgBody.scrollHeight;
            } else {
                // AI trả lời: cuộn để câu trả lời hiển thị ở TRÊN ĐẦU, không kéo xuống cuối
                requestAnimationFrame(() => {
                    const top = wrapper.offsetTop - msgBody.offsetTop - 8;
                    msgBody.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                });
            }
        }

        function showLoading() {
            const loadDiv = document.createElement('div');
            loadDiv.id = 'gemini-ai-waiting';
            loadDiv.style.cssText = 'align-self:flex-start; background:var(--soft); color:var(--text-light); padding:10px 14px; border-radius:15px; max-width:85%; font-size:12px; font-style:italic;';
            loadDiv.innerText = 'Trợ lý đang suy nghĩ... 🧠';
            msgBody.appendChild(loadDiv);
            msgBody.scrollTop = msgBody.scrollHeight;
        }

        function removeLoading() {
            const target = document.getElementById('gemini-ai-waiting');
            if (target) target.remove();
        }

        async function requestGeminiAI(userPrompt) {
            aiChatHistory.push({ role: "user", parts: [{ text: userPrompt }] });
            if (aiChatHistory.length > 24) aiChatHistory.shift();

            const systemText = `Bạn là trợ lý AI thông minh tích hợp trên ứng dụng "Lớp Học Công Giáo". Bạn nói chuyện với học viên cực kỳ thân thiện, lễ phép, sử dụng các icon vui tươi và từ ngữ sư phạm Công giáo. Bạn giúp giải đáp các thắc mắc về Giáo lý, bài học và Kinh Thánh. Người đang chat với bạn tên là: ${getAppUserName()}.`;

            try {
                // Lấy API key từ Firebase (không lộ ra source code)
                const apiKey = await layGeminiKeyTừFirebase();

                // Gọi thẳng Google Gemini API — dùng đúng shape contents/parts
                const endpoint = `${GEMINI_API_BASE}/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`;
                const apiResponse = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: aiChatHistory,
                        systemInstruction: { role: "system", parts: [{ text: systemText }] },
                        generationConfig: { temperature: 0.7 }
                    })
                });

                const data = await apiResponse.json();
                removeLoading();

                const botReply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("\n");
                if (apiResponse.ok && botReply) {
                    aiChatHistory.push({ role: "model", parts: [{ text: botReply }] });
                    pushMessageToScreen(botReply, false);
                } else if (data?.error) {
                    aiChatHistory.pop();
                    const errMsg = typeof data.error === "string" ? data.error : (data.error.message || "Không rõ");
                    // Nếu key sai/hết hạn thì xóa cache để lần sau đọc lại từ Firebase
                    if (/API key|permission|invalid/i.test(errMsg)) _cachedGeminiKey = null;
                    pushMessageToScreen("❌ Google Gemini báo lỗi: " + errMsg, false);
                } else {
                    aiChatHistory.pop();
                    pushMessageToScreen("❌ Gặp sự cố xử lý câu hỏi. Bạn thử lại nhé!", false);
                }
            } catch (err) {
                removeLoading();
                aiChatHistory.pop();
                pushMessageToScreen("❌ " + (err && err.message ? err.message : "Lỗi đường truyền đến Google Gemini."), false);
            }
        }

        // SỬA LỖI: Thêm khóa chống gửi trùng - trước đây bấm gửi liên tục hoặc
        // nhấn Enter nhiều lần khi AI đang trả lời sẽ tạo nhiều request chồng chéo
        // khiến lịch sử hội thoại rối loạn và AI trả lời lung tung.
        let isAiBusy = false;

        async function executeSend() {
            const msg = inputField.value.trim();
            if (!msg || isAiBusy) return;

            isAiBusy = true;
            sendBtn.style.opacity = '0.5';

            pushMessageToScreen(msg, true);
            inputField.value = "";
            showLoading();
            try {
                await requestGeminiAI(msg);
            } finally {
                isAiBusy = false;
                sendBtn.style.opacity = '1';
            }
        }

        sendBtn.addEventListener('click', executeSend);
        inputField.addEventListener('keypress', (event) => {
            // Chống gửi nhầm khi đang gõ tiếng Việt/CJK bằng bộ gõ (IME)
            if (event.isComposing || event.keyCode === 229) return;
            if (event.key === 'Enter') executeSend();
        });

        console.log("🚀 AI Assistant: Đã kích hoạt thành công cho người dùng " + getAppUserName());
    }

    // 3. BỘ GIÁM SÁT ĐĂNG NHẬP (QUAN TRỌNG)
    // Cứ mỗi 1 giây sẽ kiểm tra xem window.session đã tồn tại hay chưa
    const checkLoginStatusTimer = setInterval(() => {
        // SỬA LỖI: session dùng thuộc tính .id chứ không phải .uid nên AI không bao giờ kích hoạt
        if (window.session && window.session.id) { 
            // Nếu phát hiện thấy session tồn tại (đã vào trong ứng dụng thành công)
            clearInterval(checkLoginStatusTimer); // Dừng bộ đếm ngầm
            khởiTạoTrợLýAI(); // Tiến hành dựng khung chat AI lên màn hình
        }
    }, 1000);
})();
// =========================================================
// SỬA LỖI LOGIC ẨN NGHIÊM TRỌNG (ĐÃ GỠ BỎ):
// Trước đây tại vị trí này có 1 khối code định nghĩa LẠI các hàm
// onChatInput, sendGlobalChat, sendPrivateChat, sendGroupChat.
// Vì file chạy từ trên xuống, khối này GHI ĐÈ lên các hàm thật ở Phần 9:
//   - sendPrivateChat & sendGroupChat bị thay bằng hàm rỗng (chỉ console.log)
//     => Chat Riêng và Chat Nhóm bấm gửi không có tác dụng gì.
//   - sendGlobalChat bị thay bằng bản ghi vào SAI nhánh 'chats/global'
//     (app đọc từ 'chat/global_<làng>') và sai tên trường (uid/timestamp
//     thay vì id/time) => tin nhắn gửi đi "mất tích", không hiển thị.
//   - onChatInput bị thay bằng console.log => mất báo "đang gõ...".
// Toàn bộ khối lỗi đã được xóa để các hàm thật hoạt động trở lại.
// =========================================================

// =========================================================
// BỔ SUNG 2 HÀM BỊ THIẾU: ĐỔI MẬT KHẨU BOSS (BẢO MẬT 2 LỚP)
// HTML có nút onclick="verifyAdminPassPin()" và "changeAdminPass()"
// nhưng hàm không tồn tại => bấm vào là app báo "HỆ THỐNG LỖI".
// =========================================================
window.verifyAdminPassPin = () => {
    const pinInput = document.getElementById('admin-pass-pin');
    const pin = pinInput ? pinInput.value.trim() : '';
    if (!pin) return window.showCustomAlert("LỖI", "Vui lòng nhập mã PIN!", "⚠️");

    window.db.ref('config/clearPin').once('value').then(s => {
        if (String(s.val()) === pin) {
            if (pinInput) pinInput.value = '';
            window.toggleModal('admin-pass-auth-modal', false);
            window.toggleModal('admin-pass-edit-modal', true);
        } else {
            window.showCustomAlert("SAI MÃ PIN", "Mã PIN không chính xác!", "🚫");
        }
    }).catch(err => window.showCustomAlert("LỖI", "Không kiểm tra được PIN: " + err.message, "❌"));
};

// =========================================================
// NÂNG CẤP QUYỀN ĐIỂM, ĐÓNG TIỀN VÀ CHAT RIÊNG
// Các kiểm tra phía client này phải đi cùng Firebase Rules.
// =========================================================
window.requireRole = (roles, actionName) => {
    if (!window.session || !window.db || !roles.includes(window.session.role)) {
        window.showCustomAlert('KHÔNG CÓ QUYỀN', `Bạn không được phép ${actionName || 'thực hiện thao tác này'}.`, '🔒');
        return false;
    }
    return true;
};

window.confirmSaveScore = async () => {
    if (!window.requireRole(['admin', 'ql', 'gv'], 'sửa điểm')) return;
    const id = document.getElementById('score-u-id')?.value.trim();
    const term = document.getElementById('score-term')?.value;
    const button = document.querySelector('#score-modal .btn-royal');
    const fields = ['score-m', 'score-15p', 'score-1t', 'score-thi'];
    const values = fields.map(field => Number(document.getElementById(field)?.value));
    if (!id || !['1', '2'].includes(term) || values.some(value => !Number.isFinite(value) || value < 0 || value > 10)) {
        return window.showCustomAlert('ĐIỂM KHÔNG HỢP LỆ', 'Mỗi điểm phải là số từ 0 đến 10.', '⚠️');
    }
    if (button?.disabled) return;
    if (button) { button.disabled = true; button.textContent = 'ĐANG LƯU...'; }
    const score = { m: values[0], p: values[1], t: values[2], thi: values[3], hk: document.getElementById('score-conduct')?.value || 'Tốt', updatedBy: window.session.id, updatedAt: firebase.database.ServerValue.TIMESTAMP };
    try {
        await window.db.ref(`grades/${id}/hk${term}`).set(score);
        const _targetName = (window.allUsersMap && window.allUsersMap[id] && window.allUsersMap[id].name) ? window.allUsersMap[id].name : (document.getElementById('score-student-name')?.textContent || id);
        await window.db.ref('grade_logs').push({
            by_id: window.session.id,
            by_name: window.session.name,
            target_id: id,
            target_name: _targetName,
            term: term,
            score,
            time: firebase.database.ServerValue.TIMESTAMP
        });
        window.toggleModal('score-modal', false);
        window.showCustomAlert('ĐÃ LƯU ĐIỂM', 'Điểm và lịch sử chỉnh sửa đã được cập nhật.', '✅');
    } catch (error) {
        window.showCustomAlert('KHÔNG THỂ LƯU', error.message || 'Vui lòng kiểm tra kết nối và quyền Firebase.', '❌');
    } finally {
        if (button) { button.disabled = false; button.textContent = 'LƯU ĐIỂM'; }
    }
};

// ==========================================
// TAB ĐÓNG TIỀN - v3: render tăng tiến (mượt) + đồng bộ realtime với database
// ==========================================
window.paymentRef = null;
window.paymentState = {
    students: [], payments: {}, filter: 'all', search: '',
    pending: {},        // studentId -> true khi đang ghi lên database
    renderedIds: [],    // thứ tự các dòng đang hiển thị (để biết khi nào cần dựng lại)
    undo: null, undoTimer: null
};

window.loadPayments = () => {
    if (!window.requireRole(['admin', 'ql', 'gv'], 'xem danh sách đóng tiền')) return;
    const list = document.getElementById('payment-student-list');
    if (!list) return;
    if (window.paymentRef) { window.paymentRef.off(); window.paymentRef = null; }
    Promise.all([window.db.ref('users').once('value'), window.db.ref('payments').once('value')]).then(([usersSnap, paymentsSnap]) => {
        const users = usersSnap.val() || {};
        window.paymentState.payments = paymentsSnap.val() || {};
        window.paymentState.students = Object.entries(users)
            .filter(([, u]) => u.role === 'hs')
            .map(([id, u]) => ({ id, name: u.name || id, avatar: u.avatar || '' }))
            .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
        window.paymentState.renderedIds = [];
        window.renderPayments();

        // Đồng bộ realtime: chỉ vá đúng dòng thay đổi, không dựng lại cả danh sách
        window.paymentRef = window.db.ref('payments');
        const applyRemote = snap => {
            const id = snap.key;
            if (window.paymentState.pending[id]) return; // đang chờ ghi của chính mình
            window.paymentState.payments[id] = snap.val();
            window.syncPaymentRow(id);
        };
        window.paymentRef.on('child_added', applyRemote);
        window.paymentRef.on('child_changed', applyRemote);
        window.paymentRef.on('child_removed', snap => {
            if (window.paymentState.pending[snap.key]) return;
            delete window.paymentState.payments[snap.key];
            window.syncPaymentRow(snap.key);
        });
    }).catch(error => { list.innerHTML = `<div class="card payment-error">Không tải được dữ liệu: ${window.escapeHTML(error.message)}</div>`; });
};

// --- Thống kê + thanh tiến trình (rẻ, gọi mỗi lần đổi trạng thái) ---
window.renderPaymentStats = () => {
    const { students, payments } = window.paymentState;
    const total = students.length;
    const paidCount = students.filter(s => payments[s.id]?.status === 'paid').length;
    const pct = total ? Math.round(paidCount * 100 / total) : 0;
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('pay-total', total);
    setTxt('pay-paid', paidCount);
    setTxt('pay-unpaid', total - paidCount);
    const bar = document.getElementById('pay-progress-bar'); if (bar) bar.style.width = pct + '%';
    setTxt('pay-progress-lbl', pct + '% đã hoàn tất');
};

window.paymentMetaHTML = (rec) => {
    if (!rec || !rec.updatedByName || !rec.updatedAt) return '';
    const d = new Date(rec.updatedAt);
    const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0'), mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${window.escapeHTML(rec.updatedByName)} • ${dd}/${mo} ${hh}:${mm}`;
};

window.paymentVisibleIds = () => {
    const { students, payments, filter, search } = window.paymentState;
    const q = (search || '').toLowerCase().trim();
    return students.filter(s => {
        const p = payments[s.id]?.status === 'paid';
        if (filter === 'paid' && !p) return false;
        if (filter === 'unpaid' && p) return false;
        if (q && !(s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))) return false;
        return true;
    }).map(s => s.id);
};

// Vá 1 dòng tại chỗ — không đụng tới các dòng khác (giữ scroll, không nháy)
window.syncPaymentRow = (studentId) => {
    window.renderPaymentStats();
    const row = document.getElementById('payment-' + studentId);
    if (!row) {
        // Dòng chưa hiển thị nhưng bộ lọc có thể vừa đổi -> dựng lại danh sách
        if (window.paymentVisibleIds().includes(studentId)) window.renderPayments(true);
        return;
    }
    const rec = window.paymentState.payments[studentId] || {};
    const paid = rec.status === 'paid';
    row.classList.toggle('is-paid', paid);
    row.classList.remove('is-flash'); void row.offsetWidth; row.classList.add('is-flash');
    const btn = row.querySelector('.pay-toggle');
    if (btn) {
        btn.classList.toggle('paid', paid);
        btn.textContent = paid ? '✓ ĐÃ ĐÓNG' : '⏳ CHƯA ĐÓNG';
        btn.disabled = !!window.paymentState.pending[studentId];
    }
    const metaText = window.paymentMetaHTML(rec);
    let meta = row.querySelector('.payment-meta');
    if (metaText) {
        if (!meta) {
            meta = document.createElement('div');
            meta.className = 'payment-meta';
            row.querySelector('.payment-student')?.appendChild(meta);
        }
        meta.innerHTML = metaText;
    } else if (meta) meta.remove();

    // Nếu đang lọc và dòng này không còn hợp lệ -> bỏ khỏi danh sách một cách mượt
    if (window.paymentState.filter !== 'all' && !window.paymentVisibleIds().includes(studentId)) {
        row.style.transition = 'opacity .25s ease, transform .25s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(12px)';
        setTimeout(() => window.renderPayments(true), 250);
    }
};

window.renderPayments = (force) => {
    const list = document.getElementById('payment-student-list');
    if (!list) return;
    window.renderPaymentStats();

    const ids = window.paymentVisibleIds();
    const same = !force && ids.length === window.paymentState.renderedIds.length
        && ids.every((id, i) => id === window.paymentState.renderedIds[i])
        && list.querySelector('.payment-row');
    if (same) { ids.forEach(id => window.syncPaymentRowQuiet(id)); return; }

    window.paymentState.renderedIds = ids;
    if (!ids.length) { list.innerHTML = '<div class="card payment-empty">Không có học sinh nào phù hợp.</div>'; return; }

    const byId = {};
    window.paymentState.students.forEach(s => { byId[s.id] = s; });
    list.innerHTML = ids.map(id => {
        const s = byId[id];
        const rec = window.paymentState.payments[id] || {};
        const paid = rec.status === 'paid';
        const initial = (s.name || s.id).trim().charAt(0);
        const metaText = window.paymentMetaHTML(rec);
        const meta = metaText ? `<div class="payment-meta">${metaText}</div>` : '';
        const sid = window.escapeHTML(s.id);
        return `<article class="payment-row ${paid ? 'is-paid' : ''}" id="payment-${sid}">
          <div class="payment-avatar">${window.escapeHTML(initial)}</div>
          <div class="payment-student">
            <strong>${window.escapeHTML(s.name)}</strong>
            <small>ID: ${sid.toUpperCase()}</small>
            ${meta}
          </div>
          <button class="pay-toggle ${paid ? 'paid' : ''}" onclick="window.requestPaymentToggle('${sid}')">
            ${paid ? '✓ ĐÃ ĐÓNG' : '⏳ CHƯA ĐÓNG'}
          </button>
        </article>`;
    }).join('');
};

// Cập nhật dòng mà không chạy hiệu ứng flash (dùng khi render lại danh sách cũ)
window.syncPaymentRowQuiet = (studentId) => {
    const row = document.getElementById('payment-' + studentId);
    if (!row) return;
    const rec = window.paymentState.payments[studentId] || {};
    const paid = rec.status === 'paid';
    row.classList.toggle('is-paid', paid);
    const btn = row.querySelector('.pay-toggle');
    if (btn) {
        btn.classList.toggle('paid', paid);
        btn.textContent = paid ? '✓ ĐÃ ĐÓNG' : '⏳ CHƯA ĐÓNG';
        btn.disabled = !!window.paymentState.pending[studentId];
    }
};

window.setPayFilter = (f) => {
    window.paymentState.filter = f;
    document.querySelectorAll('.pay-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === f));
    window.renderPayments(true);
};
window.filterPayments = () => {
    const el = document.getElementById('pay-search');
    window.paymentState.search = el ? el.value : '';
    clearTimeout(window.paymentState._searchTimer);
    window.paymentState._searchTimer = setTimeout(() => window.renderPayments(true), 120);
};

// Toast nhẹ thay cho hộp thoại chặn — phản hồi tức thì, tự ẩn
window.showPayToast = (msg, ok) => {
    const toast = document.getElementById('pay-undo-toast');
    const label = document.getElementById('pay-undo-msg');
    if (!toast || !label) return;
    label.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.toggle('is-error', ok === false);
    toast.querySelectorAll('.pay-undo-btn').forEach(b => b.classList.add('hidden'));
    clearTimeout(window.paymentState._toastTimer);
    window.paymentState._toastTimer = setTimeout(() => toast.classList.add('hidden'), 1800);
};

// Xác nhận trước khi đổi (không dùng mã PIN)
window.requestPaymentToggle = (studentId) => {
    if (!window.requireRole(['admin', 'ql', 'gv'], 'cập nhật đóng tiền')) return;
    if (window.paymentState.pending[studentId]) return;
    const s = window.paymentState.students.find(x => x.id === studentId);
    if (!s) return;
    const wasPaid = window.paymentState.payments[studentId]?.status === 'paid';
    const nextPaid = !wasPaid;
    const msg = nextPaid
        ? `Xác nhận đánh dấu\n\n"${s.name}"\n\nlà ĐÃ ĐÓNG TIỀN?`
        : `Chuyển "${s.name}" về\nCHƯA ĐÓNG TIỀN?`;
    const title = nextPaid ? 'XÁC NHẬN ĐÃ ĐÓNG' : 'XÁC NHẬN CHƯA ĐÓNG';

    const doCommit = () => window.commitPayment(studentId, nextPaid, wasPaid, { pinType: 'none', pinCode: '' });
    if (typeof window.showCustomConfirm === 'function') {
        window.showCustomConfirm(title, msg, doCommit);
    } else if (window.confirm(msg)) {
        doCommit();
    }
};


// Giữ tương thích: các hàm undo cũ vô hiệu hoá (không còn dùng)
window.showUndoToast = () => {};
window.hideUndoToast = () => {
    const toast = document.getElementById('pay-undo-toast');
    if (toast) toast.classList.add('hidden');
};
window.undoPayment = () => {};

window.clearPaymentPinCache = () => {};

// Vá memory leak: rời tab thì tắt listener
window.unloadPayments = () => {
    if (window.paymentRef) { window.paymentRef.off(); window.paymentRef = null; }
    window.paymentState.pending = {};
    window.hideUndoToast();
};


window.loadMyNicknames = () => {
    if (!window.session) return;
    window.db.ref(`nicknames/${window.session.id}`).on('value', snap => { window.myNicknames = snap.val() || {}; if (typeof window.renderRecentChats === 'function') window.renderRecentChats(); });
};
window.promptCurrentNickname = () => {
    const targetId = window.currentPrivateTarget;
    if (!targetId) return;
    const current = window.myNicknames?.[targetId] || window.currentPrivateTargetName || '';
    const nickname = window.prompt('Đặt biệt danh chỉ hiển thị với bạn:', current);
    if (nickname === null) return;
    const clean = nickname.trim().slice(0, 40);
    const ref = window.db.ref(`nicknames/${window.session.id}/${targetId}`);
    (clean ? ref.set(clean) : ref.remove()).then(() => {
        window.myNicknames[targetId] = clean;
        document.getElementById('private-chat-title').textContent = clean || window.currentPrivateTargetName;
        window.renderRecentChats();
    }).catch(error => window.showCustomAlert('LỖI BIỆT DANH', error.message, '❌'));
};

window.areFriends = async targetId => (await window.db.ref(`friends/${window.session.id}/${targetId}`).once('value')).val() === 'accepted';
window.canSendPrivateMessage = async targetId => {
    if (await window.areFriends(targetId)) return { allowed: true, friends: true };
    const snap = await window.db.ref(`chat/private/${window.currentPrivateConvo}`).once('value');
    let sent = 0, receivedAfterSend = false, firstSentAt = 0;
    snap.forEach(child => { const msg = child.val() || {}; const time = Number(msg.time) || 0; if (msg.id === window.session.id) { sent += 1; if (!firstSentAt || time < firstSentAt) firstSentAt = time; } else if (firstSentAt && time > firstSentAt) receivedAfterSend = true; });
    return { allowed: sent === 0 || receivedAfterSend, friends: false, opening: sent === 0 };
};
window.updateStrangerNotice = async targetId => {
    const notice = document.getElementById('stranger-message-notice');
    if (!notice) return;
    const state = await window.canSendPrivateMessage(targetId);
    notice.classList.toggle('hidden', state.friends);
    notice.textContent = state.allowed ? 'Chưa kết bạn: bạn được gửi một tin nhắn mở đầu.' : 'Đang chờ người này phản hồi. Bạn chưa thể gửi thêm tin nhắn.';
};

const legacyStartPrivateChat = window.checkAndStartPrivateChat;
window.checkAndStartPrivateChat = (targetId, targetName, allowPrivate) => {
    if (!allowPrivate && !window.isAdminLevel()) return window.showCustomAlert('NGƯỜI DÙNG ĐÃ TẮT CHAT', 'Không thể gửi tin nhắn riêng cho tài khoản này.', '🔕');
    window.currentPrivateTarget = targetId;
    window.currentPrivateTargetName = targetName;
    legacyStartPrivateChat(targetId, targetName, allowPrivate);
    const title = document.getElementById('private-chat-title');
    if (title) title.textContent = window.myNicknames?.[targetId] || targetName;
    window.updateStrangerNotice(targetId).catch(() => {});
};

window.sendPrivateChat = async () => {
    const input = document.getElementById('private-chat-input');
    const text = input?.value.trim();
    const targetId = window.currentPrivateTarget;
    if (!text || !targetId || !window.session || !window.currentPrivateConvo) return;
    input.disabled = true;
    try {
        const permission = await window.canSendPrivateMessage(targetId);
        if (!permission.allowed) return window.showCustomAlert('ĐANG CHỜ PHẢN HỒI', 'Hai bạn chưa kết bạn. Hãy chờ người nhận trả lời tin nhắn mở đầu.', '🔒');
        const lockRef = window.db.ref(`stranger_message_locks/${window.currentPrivateConvo}/${window.session.id}`);
        if (!permission.friends && permission.opening) {
            const lock = await lockRef.transaction(current => current ? undefined : { time: firebase.database.ServerValue.TIMESTAMP });
            if (!lock.committed) return window.showCustomAlert('TIN ĐÃ ĐƯỢC GỬI', 'Bạn chỉ được gửi một tin mở đầu khi chưa kết bạn.', '🔒');
        }
        await window.db.ref(`chat/private/${window.currentPrivateConvo}`).push({ id: window.session.id, name: window.session.name, text, time: firebase.database.ServerValue.TIMESTAMP });
        await window.db.ref(`unread/${targetId}/${window.session.id}`).set(true);
        input.value = '';
        await window.db.ref(`typing/private/${window.currentPrivateConvo}/${window.session.id}`).remove();
        await window.updateStrangerNotice(targetId);
    } catch (error) {
        window.showCustomAlert('KHÔNG GỬI ĐƯỢC', error.message || 'Vui lòng thử lại.', '❌');
    } finally { input.disabled = false; input.focus(); }
};

window.uploadChatImage = async () => {
    const input = document.getElementById('chat-img-file');
    const file = input?.files?.[0];
    if (!file || !window.session) return;
    let reservedLockRef = null;
    try {
        if (window.currentUploadType === 'private') {
            const permission = await window.canSendPrivateMessage(window.currentPrivateTarget);
            if (!permission.allowed) return window.showCustomAlert('ĐANG CHỜ PHẢN HỒI', 'Bạn chưa thể gửi thêm ảnh khi người nhận chưa phản hồi.', '🔒');
            if (!permission.friends && permission.opening) {
                reservedLockRef = window.db.ref(`stranger_message_locks/${window.currentPrivateConvo}/${window.session.id}`);
                const lock = await reservedLockRef.transaction(current => current ? undefined : { time: firebase.database.ServerValue.TIMESTAMP });
                if (!lock.committed) { reservedLockRef = null; return window.showCustomAlert('TIN ĐÃ ĐƯỢC GỬI', 'Bạn chỉ được gửi một tin mở đầu khi chưa kết bạn.', '🔒'); }
            }
        }
        window.showCustomAlert('ĐANG GỬI ẢNH', 'Vui lòng chờ tải ảnh hoàn tất.', '');
        const url = await window.uploadToImgBB(file);
        if (!url) throw new Error('Không tải được ảnh.');
        const payload = { id: window.session.id, name: window.session.name, text: `[IMG]${url}[/IMG]`, time: firebase.database.ServerValue.TIMESTAMP };
        if (window.currentUploadType === 'global') await window.db.ref(`chat/global_${window.currentVillage}`).push(payload);
        if (window.currentUploadType === 'private') {
            await window.db.ref(`chat/private/${window.currentPrivateConvo}`).push(payload);
            await window.db.ref(`unread/${window.currentPrivateTarget}/${window.session.id}`).set(true);
            await window.updateStrangerNotice(window.currentPrivateTarget);
        }
    } catch (error) {
        if (reservedLockRef) await reservedLockRef.remove().catch(() => {});
        window.showCustomAlert('GỬI ẢNH THẤT BẠI', error.message || 'Vui lòng thử lại.', '❌');
    } finally { if (input) input.value = ''; }
};

window.addEventListener('load', () => {
    const waitForSession = setInterval(() => {
        if (!window.session || !window.db) return;
        clearInterval(waitForSession);
        window.loadMyNicknames();
    }, 300);
});

window.changeAdminPass = () => {
    const oldEl = document.getElementById('old-admin-pass');
    const newEl = document.getElementById('new-admin-pass');
    const oldPass = oldEl ? oldEl.value.trim() : '';
    const newPass = newEl ? newEl.value.trim() : '';

    if (!oldPass || !newPass) return window.showCustomAlert("LỖI", "Vui lòng điền đủ mật khẩu cũ và mới!", "⚠️");
    if (newPass.length < 6) return window.showCustomAlert("LỖI", "Mật khẩu mới phải từ 6 ký tự trở lên!", "⚠️");

    const user = firebase.auth().currentUser;
    if (!user) return window.showCustomAlert("LỖI", "Phiên đăng nhập đã hết hạn, hãy đăng nhập lại!", "❌");

    // Xác thực lại bằng mật khẩu cũ trước khi đổi (yêu cầu của Firebase)
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, oldPass);
    user.reauthenticateWithCredential(credential).then(() => {
        return user.updatePassword(newPass);
    }).then(() => {
        if (oldEl) oldEl.value = '';
        if (newEl) newEl.value = '';
        window.toggleModal('admin-pass-edit-modal', false);
        window.showCustomAlert("THÀNH CÔNG", "Đã đổi mật khẩu Boss thành công!", "✅");
    }).catch(err => {
        const msg = (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
            ? "Mật khẩu cũ không chính xác!"
            : "Không thể đổi mật khẩu: " + err.message;
        window.showCustomAlert("THẤT BẠI", msg, "❌");
    });
};


// PRE-FILL: Khi mở trang đăng nhập, nếu có tài khoản đã từng đăng nhập → dùng avatar cache làm logo tạm
(() => {
    const run = () => {
        try {
            const lastId = localStorage.getItem('lastLoginId');
            if (!lastId) return;
            const cachedAvt = localStorage.getItem('cachedAvatar_' + lastId);
            const idInput = document.getElementById('username');
            if (idInput && !idInput.value) idInput.value = lastId;
            const logoEl = document.getElementById('main-login-logo');
            // Chỉ ghi đè nếu chưa có branding logo (tránh đè lên logo lớp học)
            if (logoEl && cachedAvt && !localStorage.getItem('cachedBrandLogo')) {
                logoEl.src = cachedAvt;
                logoEl.classList.remove('hidden');
            }
        } catch(e) {}
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
})();

// =========================================================
// ADMIN · CHỈNH NỘI QUY LỚP HỌC (LƯU LÊN FIREBASE)
// =========================================================

// --- Chống brute-force PIN quản trị ---
// Lưu số lần sai + thời điểm hết khoá vào localStorage.
// Ngưỡng khoá luỹ tiến: 3 lần sai = 30s, 5 = 2 phút, 7 = 10 phút, 10+ = 1 giờ.
const ADMIN_PIN_LS_KEY = 'adminRulesPinGuard.v1';
function _readPinGuard() {
    try {
        const raw = localStorage.getItem(ADMIN_PIN_LS_KEY);
        if (!raw) return { fails: 0, lockUntil: 0 };
        const obj = JSON.parse(raw);
        return { fails: Number(obj.fails) || 0, lockUntil: Number(obj.lockUntil) || 0 };
    } catch(_) { return { fails: 0, lockUntil: 0 }; }
}
function _writePinGuard(g) {
    try { localStorage.setItem(ADMIN_PIN_LS_KEY, JSON.stringify(g)); } catch(_) {}
}
function _clearPinGuard() {
    try { localStorage.removeItem(ADMIN_PIN_LS_KEY); } catch(_) {}
}
function _lockDurationFor(fails) {
    if (fails >= 10) return 60 * 60 * 1000;
    if (fails >= 7)  return 10 * 60 * 1000;
    if (fails >= 5)  return 2  * 60 * 1000;
    if (fails >= 3)  return 30 * 1000;
    return 0;
}
function _fmtRemain(ms) {
    const s = Math.max(1, Math.ceil(ms / 1000));
    if (s < 60) return s + ' giây';
    const m = Math.floor(s / 60), r = s % 60;
    return r ? (m + ' phút ' + r + ' giây') : (m + ' phút');
}
let _pinLockTimer = null;
function _renderPinLockUI() {
    const gate  = document.getElementById('admin-rules-gate');
    const input = document.getElementById('admin-rules-pin');
    if (!gate) return;
    let hint = document.getElementById('admin-rules-lock-hint');
    if (!hint) {
        hint = document.createElement('p');
        hint.id = 'admin-rules-lock-hint';
        hint.style.cssText = 'margin-top:10px;font-size:12px;text-align:center;font-weight:600;';
        gate.appendChild(hint);
    }
    const btn = gate.querySelector('button.btn-royal');
    const g = _readPinGuard();
    const now = Date.now();
    if (g.lockUntil > now) {
        const remain = g.lockUntil - now;
        hint.style.color = '#dc3545';
        hint.textContent = '🔒 Tạm khoá do nhập sai nhiều lần. Thử lại sau ' + _fmtRemain(remain) + '.';
        if (input) { input.disabled = true; input.value = ''; }
        if (btn)   { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; }
        if (_pinLockTimer) clearTimeout(_pinLockTimer);
        _pinLockTimer = setTimeout(_renderPinLockUI, Math.min(remain, 1000));
    } else {
        if (_pinLockTimer) { clearTimeout(_pinLockTimer); _pinLockTimer = null; }
        if (input) input.disabled = false;
        if (btn)   { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
        if (g.fails > 0) {
            const left = Math.max(0, 3 - g.fails);
            hint.style.color = '#e67e22';
            hint.textContent = g.fails >= 3
                ? ('⚠️ Đã sai ' + g.fails + ' lần. Sai thêm sẽ bị khoá lâu hơn.')
                : ('⚠️ Đã sai ' + g.fails + ' lần. Còn ' + left + ' lần trước khi tạm khoá.');
        } else {
            hint.textContent = '';
        }
    }
}

window.openAdminRulesGate = function() {
    const modal = document.getElementById('admin-rules-modal');
    const gate  = document.getElementById('admin-rules-gate');
    const edit  = document.getElementById('admin-rules-editor');
    const pin   = document.getElementById('admin-rules-pin');
    if (!modal) return;
    if (gate) gate.classList.remove('hidden');
    if (edit) edit.classList.add('hidden');
    if (pin) { pin.value = ''; setTimeout(() => { if (!pin.disabled) pin.focus(); }, 60); }
    modal.classList.remove('hidden');
    _renderPinLockUI();
};

window.closeAdminRules = function() {
    const modal = document.getElementById('admin-rules-modal');
    if (modal) modal.classList.add('hidden');
    if (_pinLockTimer) { clearTimeout(_pinLockTimer); _pinLockTimer = null; }
};

window.verifyAdminRulesPin = async function() {
    const pinInput = document.getElementById('admin-rules-pin');
    if (!pinInput) return;

    const guard = _readPinGuard();
    const now = Date.now();
    if (guard.lockUntil > now) {
        _renderPinLockUI();
        return window.showCustomAlert && window.showCustomAlert(
            'ĐANG TẠM KHOÁ',
            'Bạn đã nhập sai PIN nhiều lần. Vui lòng thử lại sau ' + _fmtRemain(guard.lockUntil - now) + '.',
            '🔒'
        );
    }

    const pin = (pinInput.value || '').trim();
    if (!pin) {
        return window.showCustomAlert && window.showCustomAlert('THIẾU PIN', 'Vui lòng nhập PIN quản trị', '🔑');
    }
    if (!window.db) {
        return window.showCustomAlert && window.showCustomAlert('CHƯA KẾT NỐI', 'Firebase chưa sẵn sàng, thử lại sau vài giây', '⚠️');
    }
    try {
        const snap = await window.db.ref('config/clearPin').once('value');
        const truePin = snap && snap.val();
        if (!truePin) {
            return window.showCustomAlert && window.showCustomAlert('CHƯA CÀI PIN', 'PIN quản trị chưa được thiết lập trên Firebase (config/clearPin)', '⚠️');
        }
        if (String(pin) !== String(truePin)) {
            const g = _readPinGuard();
            g.fails = (g.fails || 0) + 1;
            const lockMs = _lockDurationFor(g.fails);
            if (lockMs > 0) g.lockUntil = Date.now() + lockMs;
            _writePinGuard(g);
            pinInput.value = '';
            _renderPinLockUI();
            const msg = lockMs > 0
                ? ('Sai PIN. Tạm khoá ' + _fmtRemain(lockMs) + ' để bảo vệ tài khoản.')
                : ('PIN quản trị không đúng. Đã sai ' + g.fails + ' lần.');
            return window.showCustomAlert && window.showCustomAlert(lockMs > 0 ? 'TẠM KHOÁ' : 'SAI PIN', msg, lockMs > 0 ? '🔒' : '🚫');
        }
        _clearPinGuard();
        _renderPinLockUI();
        const gate = document.getElementById('admin-rules-gate');
        const edit = document.getElementById('admin-rules-editor');
        const ta   = document.getElementById('admin-rules-textarea');
        if (gate) gate.classList.add('hidden');
        if (edit) edit.classList.remove('hidden');
        const rulesSnap = await window.db.ref('config/classRules').once('value');
        const cur = rulesSnap && rulesSnap.val();
        if (ta) {
            if (cur && typeof cur === 'string') {
                ta.value = cur;
            } else {
                ta.value = 'Đi học đúng giờ, đầy đủ đồng phục.\nTôn trọng thầy cô và bạn bè.\nGiữ trật tự trong giờ học.\nTham gia đầy đủ các buổi sinh hoạt lớp.';
            }
            setTimeout(() => ta.focus(), 80);
        }
    } catch (err) {
        window.showCustomAlert && window.showCustomAlert('LỖI', 'Không kiểm tra được PIN: ' + err.message, '❌');
    }
};

window.saveAdminRules = async function() {
    const ta = document.getElementById('admin-rules-textarea');
    const status = document.getElementById('admin-rules-status');
    if (!ta) return;
    const text = (ta.value || '').trim();
    if (!text) {
        if (status) status.textContent = '⚠️ Nội quy trống — hãy nhập ít nhất 1 dòng';
        return;
    }
    if (!window.db) {
        if (status) status.textContent = '⚠️ Firebase chưa sẵn sàng';
        return;
    }
    if (status) status.textContent = '⏳ Đang lưu lên Firebase…';
    try {
        await window.db.ref('config/classRules').set(text);
        await window.db.ref('config/classRulesUpdatedAt').set(Date.now());
        if (status) status.textContent = '✅ Đã lưu — nội quy đã đồng bộ tới toàn bộ học viên';
        setTimeout(() => window.closeAdminRules(), 900);
    } catch (err) {
        if (status) status.textContent = '❌ Lỗi lưu: ' + err.message;
    }
};


// =========================================================
// TRUNG TÂM MÃ PIN (chỉ Admin) — Boss quản lý toàn bộ PIN & mật khẩu
// - PIN Admin hệ thống (config/clearPin)

// - Lịch sử đóng tiền (payment_history/*)
// - Kho mật khẩu (user_passwords/admin)
// =========================================================
window.pinCenterState = {
    pins: {},
    history: {},
    filter: 'active',
    refs: { pins: null, history: null, config: null, pass: null }
};

window.loadPinCenter = () => {
    if (!window.session || !window.isBoss()) {
        return window.showCustomAlert('KHÔNG CÓ QUYỀN', 'Chỉ Boss mới được vào Trung tâm Mã PIN.', '🔒');
    }
    const S = window.pinCenterState;

    // Detach cũ
    ['config', 'pass'].forEach(k => {
        if (S.refs[k]) { try { S.refs[k].off(); } catch(e){} S.refs[k] = null; }
    });

    // 1. PIN Admin master
    S.refs.config = window.db.ref('config/clearPin');
    S.refs.config.on('value', snap => {
        window.pinCenterState.__adminPin = snap.val() || '654321';
        window.renderPinAdminView();
    });

    // 2. PIN đóng tiền
    S.refs.pass = window.db.ref('user_passwords/admin');
    S.refs.pass.on('value', snap => {
        window.pinCenterState.__adminPass = (snap.val() && snap.val().pass) || '';
        window.renderAdminVault();
    });
};

window.unloadPinCenter = () => {
    const S = window.pinCenterState;
    ['config', 'pass'].forEach(k => {
        if (S.refs[k]) { try { S.refs[k].off(); } catch(e){} S.refs[k] = null; }
    });
};

// --- Card 1: PIN Admin ---
window.__pinAdminRevealed = false;
window.togglePinAdminReveal = () => {
    window.__pinAdminRevealed = !window.__pinAdminRevealed;
    window.renderPinAdminView();
};
window.renderPinAdminView = () => {
    const val = document.getElementById('pinc-admin-pin-value');
    const btn = document.getElementById('pinc-admin-pin-eye');
    if (!val) return;
    const pin = window.pinCenterState.__adminPin || '';
    val.textContent = window.__pinAdminRevealed ? pin : '•'.repeat(Math.max(pin.length, 6));
    if (btn) btn.textContent = window.__pinAdminRevealed ? 'ẨN' : 'HIỆN';
};

// --- Card 4: Kho mật khẩu ---
window.__adminPassRevealed = false;
window.toggleAdminPassReveal = () => {
    window.__adminPassRevealed = !window.__adminPassRevealed;
    window.renderAdminVault();
};
window.renderAdminVault = () => {
    const wrap = document.getElementById('pinc-vault-list');
    if (!wrap) return;
    const pass = window.pinCenterState.__adminPass || '';
    const adminPin = window.pinCenterState.__adminPin || '';
    const mask = (s) => '•'.repeat(Math.max(s.length, 6));
    wrap.innerHTML = `
      <div style="background:var(--soft);padding:12px 14px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="min-width:0;flex:1;">
          <div style="font-size:11px;color:var(--text-light);font-weight:bold;letter-spacing:1px;">MẬT KHẨU ADMIN (đăng nhập)</div>
          <div style="font-family:'Courier New',monospace;font-size:16px;font-weight:900;color:#E91E63;word-break:break-all;">${window.__adminPassRevealed ? (window.escapeHTML(pass) || '(chưa lưu)') : mask(pass)}</div>
        </div>
        <button onclick="window.toggleAdminPassReveal()" style="background:#E91E63;color:#fff;border:none;padding:8px 14px;border-radius:10px;font-weight:bold;cursor:pointer;">${window.__adminPassRevealed ? 'ẨN' : 'HIỆN'}</button>
      </div>
      <div style="background:var(--soft);padding:12px 14px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <div style="min-width:0;flex:1;">
          <div style="font-size:11px;color:var(--text-light);font-weight:bold;letter-spacing:1px;">PIN ADMIN (bảo trì / xoá dữ liệu)</div>
          <div style="font-family:'Courier New',monospace;font-size:16px;font-weight:900;color:#673AB7;">${window.__pinAdminRevealed ? window.escapeHTML(adminPin) : mask(adminPin)}</div>
        </div>
        <button onclick="window.togglePinAdminReveal()" style="background:#673AB7;color:#fff;border:none;padding:8px 14px;border-radius:10px;font-weight:bold;cursor:pointer;">${window.__pinAdminRevealed ? 'ẨN' : 'HIỆN'}</button>
      </div>
      <div style="font-size:11px;color:var(--text-light);padding:4px 4px 0;">
        💡 Chỉ Boss (admin) mới thấy khu vực này. Dữ liệu được lấy trực tiếp từ Firebase.
      </div>`;
};

// Hook switchTab để load/unload PIN Center
(() => {
    const prev = window.switchTab;
    window.switchTab = (id) => {
        if (typeof prev === 'function') prev(id);
        if (id === 'pincenter') {
            window.loadPinCenter();
        } else if (window.pinCenterState && window.pinCenterState.refs && window.pinCenterState.refs.pins) {
            window.unloadPinCenter();
        }
    };
})();



// ==========================================
// BẢN VÁ: CÔNG TẮC MÀU PHỤNG VỤ (đồng bộ + hoạt động cả khi BẢO TRÌ)
// ==========================================
(() => {
  const PALETTE = {
    pink:   { name: 'Hồng (mặc định)', main: '#ff4d94', soft: '#ffeef2', softDark: '#2a1620' },
    white:  { name: 'Trắng / Vàng',    main: '#c9a227', soft: '#fdf6e3', softDark: '#2a2416' },
    green:  { name: 'Xanh lá',         main: '#2e7d5b', soft: '#e8f5ef', softDark: '#132a22' },
    violet: { name: 'Tím',             main: '#6a3b8a', soft: '#f2ebf7', softDark: '#221630' },
    red:    { name: 'Đỏ',              main: '#c62828', soft: '#fdeaea', softDark: '#2c1414' },
    rose:   { name: 'Hồng phụng vụ',   main: '#e77aa8', soft: '#fdeef4', softDark: '#2a1a22' }
  };

  // --- Tính ngày Phục Sinh (thuật toán Meeus/Jones/Butcher) ---
  const easterOf = (y) => {
    const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,
      f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
      i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
      mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
    return new Date(Date.UTC(y,mo-1,da));
  };
  const dayDiff = (a,b) => Math.round((a-b)/86400000);

  window.autoLiturgyColor = (date) => {
    const now = date ? new Date(date) : new Date(typeof window.now === 'function' ? window.now() : Date.now());
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const y = d.getUTCFullYear();
    const easter = easterOf(y);
    const ashWed = new Date(easter); ashWed.setUTCDate(easter.getUTCDate() - 46);
    const pentecost = new Date(easter); pentecost.setUTCDate(easter.getUTCDate() + 49);
    const palm = new Date(easter); palm.setUTCDate(easter.getUTCDate() - 7);
    const laetare = new Date(easter); laetare.setUTCDate(easter.getUTCDate() - 21);
    // Mùa Vọng: bắt đầu CN thứ 4 trước 25/12
    const xmas = new Date(Date.UTC(y, 11, 25));
    const advent = new Date(xmas); advent.setUTCDate(xmas.getUTCDate() - (xmas.getUTCDay() === 0 ? 28 : 21 + xmas.getUTCDay()));
    const gaudete = new Date(advent); gaudete.setUTCDate(advent.getUTCDate() + 14);

    const same = (a,b) => dayDiff(a,b) === 0;
    if (same(d, gaudete) || same(d, laetare)) return 'rose';
    if (same(d, pentecost) || same(d, palm) || (dayDiff(d, easter) >= -2 && dayDiff(d, easter) <= -1)) return 'red';
    if (d >= ashWed && d < easter) return 'violet';
    if (d >= easter && d <= pentecost) return 'white';
    if (d >= advent && d <= new Date(Date.UTC(y, 11, 24))) return 'violet';
    if (d >= xmas || d <= new Date(Date.UTC(y, 0, 12))) return 'white';
    return 'green';
  };

  // --- Áp màu lên toàn bộ giao diện (kể cả màn hình bảo trì) ---
  window.applyLiturgyColor = (key) => {
    const p = PALETTE[key] || PALETTE.pink;
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') === 'dark';
    root.style.setProperty('--pink', p.main);
    root.style.setProperty('--soft', isDark ? p.softDark : p.soft);
    root.setAttribute('data-liturgy', key);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.main);
    window.currentLiturgy = key;
    // đồng bộ UI công tắc / ô màu
    document.querySelectorAll('.lit-swatch').forEach(b =>
      b.classList.toggle('active', b.dataset.liturgy === key));
    const lbl = document.getElementById('liturgy-current-lbl');
    if (lbl) lbl.innerText = (window.liturgyAuto ? '🔄 Tự động: ' : '🎨 Thủ công: ') + p.name;
  };

  window.refreshLiturgy = () => {
    const key = window.liturgyAuto ? window.autoLiturgyColor() : (window.liturgyManual || 'pink');
    window.applyLiturgyColor(key);
    const zone = document.getElementById('liturgy-manual-zone');
    if (zone) zone.style.opacity = window.liturgyAuto ? '0.45' : '1';
    document.querySelectorAll('.lit-swatch').forEach(b => { b.disabled = !!window.liturgyAuto; });
    const auto = document.getElementById('liturgy-auto-toggle');
    if (auto) auto.checked = !!window.liturgyAuto;
  };

  // --- Khôi phục từ cache ngay lập tức (chạy được cả khi chưa có Firebase / đang bảo trì) ---
  try {
    window.liturgyAuto = localStorage.getItem('liturgyAuto') === 'true';
    window.liturgyManual = localStorage.getItem('liturgyManual') || 'pink';
  } catch (e) { window.liturgyAuto = false; window.liturgyManual = 'pink'; }
  window.refreshLiturgy();

  // --- Lưu + đồng bộ lên Firebase (chỉ quản trị) ---
  const persist = () => {
    try {
      localStorage.setItem('liturgyAuto', String(!!window.liturgyAuto));
      localStorage.setItem('liturgyManual', window.liturgyManual || 'pink');
    } catch (e) {}
    if (window.db && typeof window.isAdminLevel === 'function' && window.isAdminLevel() && !window.isDemoMode) {
      window.db.ref('config/liturgy').update({
        auto: !!window.liturgyAuto,
        color: window.liturgyManual || 'pink'
      }).catch(err => console.warn('[Liturgy] sync fail', err));
    }
  };

  // --- Gắn sự kiện cho công tắc & ô màu (dùng uỷ quyền nên không sợ DOM tạo sau) ---
  document.addEventListener('change', (ev) => {
    if (ev.target && ev.target.id === 'liturgy-auto-toggle') {
      window.liturgyAuto = ev.target.checked;
      window.refreshLiturgy();
      persist();
    }
    if (ev.target && ev.target.id === 'dark-mode-toggle') {
      // đồng bộ lại màu phụng vụ khi đổi sáng/tối
      setTimeout(() => window.applyLiturgyColor(window.currentLiturgy || 'pink'), 0);
    }
  });
  document.addEventListener('click', (ev) => {
    const sw = ev.target && ev.target.closest ? ev.target.closest('.lit-swatch') : null;
    if (!sw || window.liturgyAuto) return;
    window.liturgyManual = sw.dataset.liturgy || 'pink';
    window.refreshLiturgy();
    persist();
  });

  // --- Lắng nghe đồng bộ thời gian thực từ Firebase ---
  const iv = setInterval(() => {
    if (!window.db) return;
    clearInterval(iv);
    window.db.ref('config/liturgy').on('value', s => {
      const v = s.val() || {};
      window.liturgyAuto = v.auto === true;
      window.liturgyManual = v.color || 'pink';
      try {
        localStorage.setItem('liturgyAuto', String(window.liturgyAuto));
        localStorage.setItem('liturgyManual', window.liturgyManual);
      } catch (e) {}
      window.refreshLiturgy();
    }, err => console.warn('[Liturgy] listen fail', err));
  }, 500);

  // --- Tự cập nhật khi sang ngày mới (chế độ tự động) ---
  setInterval(() => { if (window.liturgyAuto) window.refreshLiturgy(); }, 60 * 60 * 1000);

  // --- Mở tab Cài đặt thì đồng bộ lại trạng thái công tắc ---
  const prevSwitchTab = window.switchTab;
  window.switchTab = (id) => {
    if (typeof prevSwitchTab === 'function') prevSwitchTab(id);
    if (id === 'settings') setTimeout(() => window.refreshLiturgy(), 0);
  };
})();

// ==========================================
// BẢN VÁ: THIẾU HÀM commitPayment (gây lỗi "window.commitPayment is not a function")
// ==========================================
window.commitPayment = (studentId, nextPaid, wasPaid, opts = {}) => {
    if (!window.requireRole(['admin', 'ql', 'gv'], 'cập nhật đóng tiền')) return Promise.resolve(false);
    if (!window.db || !studentId) return Promise.resolve(false);

    const s = (window.paymentState.students || []).find(x => x.id === studentId);
    const now = typeof window.now === 'function' ? window.now() : Date.now();
    const actor = (window.session && (window.session.name || window.session.uid)) || 'system';
    const record = {
        status: nextPaid ? 'paid' : 'unpaid',
        paidAt: nextPaid ? now : null,
        paidDate: nextPaid ? (typeof window.getDateStr === 'function' ? window.getDateStr() : new Date(now).toISOString().slice(0, 10)) : null,
        updatedAt: now,
        updatedBy: (window.session && window.session.uid) || 'system',
        updatedByName: actor
    };

    // Cập nhật lạc quan: giao diện đổi ngay lập tức, chỉ vá đúng 1 dòng
    const prev = window.paymentState.payments[studentId];
    window.paymentState.payments[studentId] = record;
    window.paymentState.pending[studentId] = true;
    window.syncPaymentRow(studentId);

    const writes = { [`payments/${studentId}`]: record };
    const histKey = window.db.ref('payment_history').push().key;
    writes[`payment_history/${histKey}`] = {
        studentId, studentName: (s && s.name) || studentId,
        from: wasPaid ? 'paid' : 'unpaid', to: record.status,
        at: now, byName: actor
    };

    return window.db.ref().update(writes).then(() => {
        delete window.paymentState.pending[studentId];
        window.syncPaymentRowQuiet(studentId);
        window.showPayToast(
            `${(s && s.name) || studentId}: ${nextPaid ? 'đã đóng tiền ✓' : 'chưa đóng tiền'}`,
            true
        );
        return true;
    }).catch(err => {
        // Khôi phục nếu ghi thất bại
        delete window.paymentState.pending[studentId];
        if (prev === undefined) delete window.paymentState.payments[studentId];
        else window.paymentState.payments[studentId] = prev;
        window.syncPaymentRow(studentId);
        console.error('[commitPayment]', err);
        window.showPayToast('Không lưu được — kiểm tra kết nối', false);
        if (typeof window.showCustomAlert === 'function') {
            window.showCustomAlert('❌ LỖI', 'Không lưu được trạng thái đóng tiền: ' + (err && err.message ? err.message : err));
        }
        return false;
    });
};
