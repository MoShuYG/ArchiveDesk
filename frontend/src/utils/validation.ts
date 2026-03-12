export type ValidationResult = {
    valid: boolean;
    message: string;
};

export function validatePassword(password: string): ValidationResult {
    if (!password) {
        return { valid: false, message: '密码不能为空' };
    }
    if (password.length < 8) {
        return { valid: false, message: '密码长度不能少于8个字符' };
    }
    if (password.length > 256) {
        return { valid: false, message: '密码长度不能超过256个字符' };
    }
    return { valid: true, message: '' };
}

export function validatePath(path: string): ValidationResult {
    if (!path || !path.trim()) {
        return { valid: false, message: '路径不能为空' };
    }
    return { valid: true, message: '' };
}

export function validateRootName(name: string): ValidationResult {
    if (!name || !name.trim()) {
        return { valid: false, message: '名称不能为空' };
    }
    if (name.length > 128) {
        return { valid: false, message: '名称长度不能超过128个字符' };
    }
    return { valid: true, message: '' };
}
