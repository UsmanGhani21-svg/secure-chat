/**
 * Ultra-Secure Anonymous Chat Application
 * Vanilla JavaScript Implementation
 */

class SecureChatApp {
    constructor() {
        this.socket = null;
        this.encryption = null;
        this.currentUser = null;
        this.currentRoom = null;
        this.rooms = [];
        this.connectionStatus = 'disconnected';
        this.isAuthenticated = false;
        
        // Initialize app
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showScreen('loadingScreen');
            
            // Initialize encryption
            await this.initializeEncryption();
            
            // Initialize socket connection
            this.initializeSocket();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Complete initialization
            setTimeout(() => {
                this.showScreen('authScreen');
            }, 2000);
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showNotification('Initialization Failed', error.message, 'error');
        }
    }

    async initializeEncryption() {
        try {
            this.updateLoadingProgress(25, '🔐 Initializing encryption...');
            
            this.encryption = await SecureEncryption.initialize();
            
            this.updateLoadingProgress(50, '🛡️ Keys generated successfully...');
            
            console.log('✅ Encryption system ready');
        } catch (error) {
            throw new Error('Encryption initialization failed: ' + error.message);
        }
    }

    initializeSocket() {
        try {
            this.updateLoadingProgress(75, '🌐 Connecting to secure server...');

            // ✅ Updated for Vercel deployment
            this.socket = io("/", {
                path: "/api/socket",
                transports: ["websocket", "polling"],
                timeout: 20000,
                forceNew: true
            });

            // Connection events
            this.socket.on('connect', () => {
                this.connectionStatus = 'connected';
                this.updateConnectionStatus();
                console.log('🔌 Connected to Vercel socket server:', this.socket.id);
                this.updateLoadingProgress(100, '✅ Connection established');
            });

            this.socket.on('disconnect', (reason) => {
                this.connectionStatus = 'disconnected';
                this.updateConnectionStatus();
                console.log('🔌 Disconnected:', reason);
                this.showNotification('Connection Lost', 'Attempting to reconnect...', 'warning');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.showNotification('Connection Error', 'Failed to connect to server', 'error');
            });

            // Authentication events
            this.socket.on('authenticated', (data) => {
                this.handleAuthentication(data);
            });

            this.socket.on('authenticationFailed', (data) => {
                this.showNotification('Authentication Failed', data.error, 'error');
            });

            // Profile events
            this.socket.on('profileSetupComplete', (data) => {
                this.handleProfileSetup(data);
            });

            this.socket.on('profileSetupFailed', (data) => {
                this.showNotification('Profile Setup Failed', data.error, 'error');
            });

            // Room events
            this.socket.on('roomCreated', (data) => {
                this.handleRoomCreated(data);
            });

            this.socket.on('roomJoined', (data) => {
                this.handleRoomJoined(data);
            });

            this.socket.on('userJoined', (data) => {
                this.handleUserJoined(data);
            });

            this.socket.on('userLeft', (data) => {
                this.handleUserLeft(data);
            });

            // Message events
            this.socket.on('newMessage', (data) => {
                this.handleNewMessage(data);
            });

            this.socket.on('messageDelivered', (data) => {
                this.handleMessageDelivered(data);
            });

            this.socket.on('userTyping', (data) => {
                this.handleUserTyping(data);
            });

            // File events
            this.socket.on('newFile', (data) => {
                this.handleNewFile(data);
            });

            this.socket.on('fileShared', (data) => {
                this.handleFileShared(data);
            });

            // Error handling
            this.socket.on('error', (data) => {
                this.showNotification('Error', data.message || 'An error occurred', 'error');
            });

        } catch (error) {
            throw new Error('Socket initialization failed: ' + error.message);
        }
    }

    // 🔽 All your other methods remain unchanged 🔽
    setupEventListeners() { /* unchanged */ }
    setupModalControls() { /* unchanged */ }
    beginAnonymousSession() { /* unchanged */ }
    handleAuthentication(data) { /* unchanged */ }
    createAnonymousProfile() { /* unchanged */ }
    handleProfileSetup(data) { /* unchanged */ }
    createRoom() { /* unchanged */ }
    joinRoom() { /* unchanged */ }
    handleRoomCreated(data) { /* unchanged */ }
    handleRoomJoined(data) { /* unchanged */ }
    handleUserJoined(data) { /* unchanged */ }
    handleUserLeft(data) { /* unchanged */ }
    addRoom(room) { /* unchanged */ }
    selectRoom(room) { /* unchanged */ }
    updateRoomsList() { /* unchanged */ }
    updateRoomUI() { /* unchanged */ }
    async sendMessage() { /* unchanged */ }
    async handleNewMessage(data) { /* unchanged */ }
    handleMessageDelivered(data) { /* unchanged */ }
    addMessage(message) { /* unchanged */ }
    addSystemMessage(text) { /* unchanged */ }
    clearMessages() { /* unchanged */ }
    async shareFile(file) { /* unchanged */ }
    async handleNewFile(data) { /* unchanged */ }
    handleFileShared(data) { /* unchanged */ }
    addFileMessage(fileData) { /* unchanged */ }
    sendTypingIndicator(isTyping) { /* unchanged */ }
    handleUserTyping(data) { /* unchanged */ }
    showScreen(screenId) { /* unchanged */ }
    showModal(modalId) { /* unchanged */ }
    hideModal(modalId) { /* unchanged */ }
    updateLoadingProgress(percent, text) { /* unchanged */ }
    updateConnectionStatus() { /* unchanged */ }
    toggleEncryptionInfo() { /* unchanged */ }
    showNotification(title, message, type = 'info') { /* unchanged */ }
    scrollToBottom() { /* unchanged */ }
    formatTime(timestamp) { /* unchanged */ }
    formatFileSize(bytes) { /* unchanged */ }
    escapeHtml(text) { /* unchanged */ }
    logout() { /* unchanged */ }
    performLogout() { /* unchanged */ }
    handleError(error, context = 'Application') { /* unchanged */ }
    startHeartbeat() { /* unchanged */ }
    cleanup() { /* unchanged */ }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!SecureEncryption.isSupported()) {
        alert('This browser does not support the required security features. Please use a modern browser.');
        return;
    }
    window.secureChatApp = new SecureChatApp();
    console.log('🚀 SecureChat application initialized');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.secureChatApp) {
        window.secureChatApp.cleanup();
    }
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.secureChatApp) {
        if (window.secureChatApp.socket && !window.secureChatApp.socket.connected) {
            window.secureChatApp.showNotification('Reconnecting', 'Attempting to reconnect...', 'warning');
        }
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.secureChatApp) {
        window.secureChatApp.handleError(event.error, 'Global');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.secureChatApp) {
        window.secureChatApp.handleError(event.reason, 'Promise');
    }
    event.preventDefault();
});
