const API_BASE = window.API_BASE_URL || localStorage.getItem('apiBaseUrl') || 'http://localhost:8080';

function apiUrl(path) {
    return `${API_BASE}${path}`;
}

function getAuthHeader() {
    const token = localStorage.getItem('authToken') || '';
    const tokenType = localStorage.getItem('authTokenType') || 'Bearer';
    const cachedHeader = localStorage.getItem('authHeader') || '';

    if (cachedHeader && cachedHeader.trim()) {
        return cachedHeader.trim();
    }

    if (token && token.trim()) {
        return `${tokenType} ${token}`.trim();
    }

    return '';
}

function withAuthHeaders(extraHeaders) {
    const headers = Object.assign({}, extraHeaders || {});
    const authHeader = getAuthHeader();
    if (authHeader) {
        headers.Authorization = authHeader;
    }
    return headers;
}

function getUserId(user) {
    return user?.id ?? user?.UserID ?? null;
}

function getUserName(user) {
    return user?.username ?? user?.UserName ?? 'Khong xac dinh';
}

function getUserEmail(user) {
    return user?.email ?? user?.Email ?? '';
}

function getUserStatus(user) {
    return user?.status ?? user?.Status ?? 'Bi khoa';
}

function isActiveUserStatus(status) {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === 'hoat dong' || normalized === 'hoạt động';
}

function toUserStatusLabel(status) {
    return isActiveUserStatus(status) ? 'Hoạt động' : 'Bị khóa';
}

function getUserCreateTime(user) {
    return user?.createTime ?? user?.CreateTime ?? null;
}

function formatDate(date) {
    if (!date) return 'Khong xac dinh';
    const formattedDate = String(date).replace(' ', 'T');
    const fm = new Date(formattedDate);
    if (isNaN(fm)) return 'Khong xac dinh';
    const yyyy = fm.getFullYear();
    const mm = fm.getMonth() + 1;
    const dd = fm.getDate();
    return `${dd < 10 ? '0' + dd : dd}/${mm < 10 ? '0' + mm : mm}/${yyyy}`;
}

function toDateValue(dateLike) {
    if (!dateLike) return null;
    const parsed = new Date(String(dateLike).replace(' ', 'T'));
    return isNaN(parsed) ? null : parsed;
}

function signUpFormReset() {
    const fullname = document.getElementById('fullname');
    const email = document.getElementById('email');
    const nameMessage = document.querySelector('.form-message-name');
    const emailMessage = document.querySelector('.form-message-email');

    if (fullname) fullname.value = '';
    if (email) email.value = '';
    if (nameMessage) nameMessage.innerHTML = '';
    if (emailMessage) emailMessage.innerHTML = '';
}

function showUserArr(users) {
    const tableBody = document.getElementById('show-user');
    if (!tableBody) return;

    let accountHtml = '';
    if (users.length === 0) {
        accountHtml = `<tr><td colspan="6">Khong co du lieu</td></tr>`;
    } else {
        users.forEach((account, index) => {
            const formattedDate = getUserCreateTime(account) ? formatDate(getUserCreateTime(account)) : 'Khong xac dinh';
            const status = toUserStatusLabel(getUserStatus(account));
            accountHtml += `
                <tr data-id="${getUserId(account)}">
                    <td>${index + 1}</td>
                    <td>${getUserName(account)}</td>
                    <td>${getUserEmail(account)}</td>
                    <td>${formattedDate}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn-edit" onclick="editAccount(${getUserId(account)})"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-delete" onclick="deleteAccount(${getUserId(account)})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
        });
    }

    tableBody.innerHTML = accountHtml;
}

let indexFlag = null;

async function showUser() {
    try {
        const usersResponse = await fetch(apiUrl('/api/users'));
        if (!usersResponse.ok) {
            console.error('Loi khi goi API:', await usersResponse.text());
            return;
        }

        const users = await usersResponse.json();
        let nonAdminUsers = users.filter(user => !['admin'].includes(String(getUserName(user)).toLowerCase()));

        const keyword = String(document.getElementById('form-search-user')?.value || '').trim().toLowerCase();
        if (keyword) {
            nonAdminUsers = nonAdminUsers.filter(user =>
                String(getUserName(user)).toLowerCase().includes(keyword) ||
                String(getUserEmail(user)).toLowerCase().includes(keyword)
            );
        }

        const selectedStatus = parseInt(document.getElementById('tinh-trang-user')?.value || '2', 10);
        if (selectedStatus !== 2) {
            nonAdminUsers = nonAdminUsers.filter(user =>
                isActiveUserStatus(getUserStatus(user)) === (selectedStatus === 1)
            );
        }

        const startDate = document.getElementById('time-start-user')?.value;
        const endDate = document.getElementById('time-end-user')?.value;

        if (startDate && endDate && startDate > endDate) {
            alert('Lua chon thoi gian sai!');
            return;
        }

        const startDateAtZero = startDate ? new Date(`${startDate}T00:00:00`) : null;
        const endDateAtLastSecond = endDate ? new Date(`${endDate}T23:59:59`) : null;

        if (startDateAtZero) {
            nonAdminUsers = nonAdminUsers.filter(user =>
                getUserCreateTime(user) && toDateValue(getUserCreateTime(user)) && toDateValue(getUserCreateTime(user)) >= startDateAtZero
            );
        }
        if (endDateAtLastSecond) {
            nonAdminUsers = nonAdminUsers.filter(user =>
                getUserCreateTime(user) && toDateValue(getUserCreateTime(user)) && toDateValue(getUserCreateTime(user)) <= endDateAtLastSecond
            );
        }

        showUserArr(nonAdminUsers);
    } catch (error) {
        console.error('Loi khi goi API:', error);
    }
}

async function cancelSearchUser() {
    try {
        const usersResponse = await fetch(apiUrl('/api/users'));
        if (!usersResponse.ok) {
            console.error('Loi khi lam moi danh sach nguoi dung:', await usersResponse.text());
            return;
        }

        const users = await usersResponse.json();
        const nonAdminUsers = users.filter(user => !['admin'].includes(String(getUserName(user)).toLowerCase()));
        showUserArr(nonAdminUsers);

        const statusInput = document.getElementById('tinh-trang-user');
        const searchInput = document.getElementById('form-search-user');
        const startInput = document.getElementById('time-start-user');
        const endInput = document.getElementById('time-end-user');

        if (statusInput) statusInput.value = '2';
        if (searchInput) searchInput.value = '';
        if (startInput) startInput.value = '';
        if (endInput) endInput.value = '';
    } catch (error) {
        console.error('Loi khi goi API:', error);
    }
}

async function deleteAccount(id) {
    if (!confirm('Ban co chac muon xoa?')) {
        return;
    }

    try {
        const response = await fetch(apiUrl(`/api/users/${id}`), {
            method: 'DELETE',
            headers: withAuthHeaders(),
        });
        if (response.ok) {
            toast({ title: 'Success', message: 'Xoa nguoi dung thanh cong!', type: 'success', duration: 3000 });
            showUser();
        } else {
            console.error('Loi khi xoa nguoi dung:', await response.text());
        }
    } catch (error) {
        console.error('Loi khi goi API:', error);
    }
}

async function editAccount(id) {
    try {
        const response = await fetch(apiUrl(`/api/users/${id}`));
        if (!response.ok) {
            console.error('Loi khi lay thong tin tai khoan:', await response.text());
            return;
        }

        const account = await response.json();
        indexFlag = id;

        const signupModal = document.querySelector('.signup');
        signupModal?.classList.add('open');
        document.querySelectorAll('.add-account-e').forEach(item => item.style.display = 'none');
        document.querySelectorAll('.edit-account-e').forEach(item => item.style.display = 'block');

        const fullname = document.getElementById('fullname');
        const email = document.getElementById('email');
        const statusCheckbox = document.getElementById('user-status');

        if (fullname) fullname.value = getUserName(account);
        if (email) email.value = getUserEmail(account);
        if (statusCheckbox) statusCheckbox.checked = isActiveUserStatus(getUserStatus(account));
    } catch (error) {
        console.error('Loi khi goi API:', error);
    }
}

async function updateAccountHandler(e) {
    e.preventDefault();
    if (!indexFlag) {
        console.error('Khong tim thay ID cua nguoi dung can cap nhat.');
        return;
    }

    const fullname = document.getElementById('fullname');
    const email = document.getElementById('email');
    const statusCheckbox = document.getElementById('user-status');

    const updatedAccount = {
        username: fullname?.value || '',
        email: email?.value || '',
        status: statusCheckbox?.checked ? 'Hoat dong' : 'Bi khoa',
    };

    try {
        const response = await fetch(apiUrl(`/api/users/${indexFlag}`), {
            method: 'PUT',
            headers: Object.assign({ 'Content-Type': 'application/json' }, withAuthHeaders()),
            body: JSON.stringify(updatedAccount),
        });
        if (response.ok) {
            toast({ title: 'Success', message: 'Cap nhat thong tin thanh cong!', type: 'success', duration: 3000 });
            document.querySelector('.signup')?.classList.remove('open');
            signUpFormReset();
            showUser();
        } else {
            console.error('Loi khi cap nhat thong tin nguoi dung:', await response.text());
        }
    } catch (error) {
        console.error('Loi khi goi API:', error);
    }
}

window.editAccount = editAccount;
window.deleteAccount = deleteAccount;

function clearAuthSession() {
    localStorage.removeItem('currentuser');
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenType');
    localStorage.removeItem('authTokenExpiresAt');
    localStorage.removeItem('authHeader');
}

function initAdminUserPage() {
    const menuIconButton = document.querySelector('.menu-icon-btn');
    const sidebar = document.querySelector('.sidebar');
    if (menuIconButton && sidebar) {
        menuIconButton.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    const searchInput = document.getElementById('form-search-user');
    if (searchInput) searchInput.addEventListener('input', showUser);

    const timeStartInput = document.getElementById('time-start-user');
    if (timeStartInput) timeStartInput.addEventListener('change', showUser);

    const timeEndInput = document.getElementById('time-end-user');
    if (timeEndInput) timeEndInput.addEventListener('change', showUser);

    const statusInput = document.getElementById('tinh-trang-user');
    if (statusInput) statusInput.addEventListener('change', showUser);

    const resetButton = document.querySelector('.btn-reset-order');
    if (resetButton) {
        resetButton.addEventListener('click', (e) => {
            e.preventDefault();
            cancelSearchUser();
        });
    }

    const logoutButton = document.getElementById('logout-acc');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            clearAuthSession();
            window.location = '/';
        });
    }

    const modalClose = document.querySelector('.modal.signup .modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            document.querySelector('.signup')?.classList.remove('open');
        });
    }

    const updateAccountButton = document.getElementById('btn-update-account');
    if (updateAccountButton) {
        updateAccountButton.addEventListener('click', updateAccountHandler);
    }

    showUser();
}

document.addEventListener('DOMContentLoaded', initAdminUserPage);
