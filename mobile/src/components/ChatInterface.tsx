import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, User, Bot, Sparkles, MoreVertical, Plus } from 'lucide-react-native';
import { Message } from '../types';
import { sendMessageToAPI, ChatMessage } from '../services/api';

// Memoized message component
const MessageItem = React.memo(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
        <View
            style={[
                styles.messageWrapper,
                isUser ? styles.userWrapper : styles.aiWrapper,
            ]}
        >
            <View style={styles.avatarContainer}>
                {isUser ? (
                    <View style={[styles.avatar, styles.userAvatar]}>
                        <User size={16} color={palette.textOnAccent} />
                    </View>
                ) : (
                    <LinearGradient
                        colors={[palette.assistantGradientStart, palette.assistantGradientEnd]}
                        style={styles.avatar}
                    >
                        <Bot size={16} color={palette.textOnAccent} />
                    </LinearGradient>
                )}
            </View>

            <View style={styles.messageContent}>
                <Text style={styles.roleText}>{isUser ? 'You' : 'Assistant'}</Text>
                <View
                    style={[
                        styles.bubble,
                        isUser ? styles.userBubble : styles.aiBubble,
                    ]}
                >
                    {isUser ? (
                        <LinearGradient
                            colors={[palette.userGradientStart, palette.userGradientEnd]}
                            style={styles.gradientBubble}
                        >
                            <Text style={styles.userText}>{item.content}</Text>
                        </LinearGradient>
                    ) : (
                        <Text style={styles.aiText}>{item.content}</Text>
                    )}
                </View>
                <Text style={styles.timeText}>
                    {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );
});

const palette = {
    background: '#F5FBF4',
    surface: '#FFFFFF',
    surfaceSoft: '#ECF6EB',
    border: '#BDD6BE',
    headerGradientStart: '#2F7D4F',
    headerGradientEnd: '#8CB867',
    assistantGradientStart: '#4A9B5F',
    assistantGradientEnd: '#8CB867',
    userGradientStart: '#2F7D4F',
    userGradientEnd: '#67A958',
    userAvatar: '#3F8E58',
    textPrimary: '#1E3B2C',
    textSecondary: '#4E6F59',
    textMuted: '#729177',
    textOnAccent: '#FFFFFF',
    iconSubtle: '#7A9A7D',
    iconOnHeader: '#E8F5DF',
    sendDisabled: '#CEE3CD',
};

const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm your AI assistant. How can I help you today?",
            createdAt: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = useCallback(async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const currentInput = input.trim();
        setInput('');
        setIsTyping(true);

        try {
            // Convert messages to API format
            const apiMessages: ChatMessage[] = messages.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            }));
            apiMessages.push({
                role: 'user',
                content: currentInput
            });

            // Call the API
            const aiResponse = await sendMessageToAPI(apiMessages);

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse,
                createdAt: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert(
                'Error',
                'Failed to get response from AI. Please try again.',
                [{ text: 'OK' }]
            );
            
            // Add error message
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                createdAt: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    }, [input, messages]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages, isTyping]);

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[palette.headerGradientStart, palette.headerGradientEnd]}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <View style={styles.headerInfo}>
                        <View style={styles.sparkleContainer}>
                            <Sparkles size={18} color={palette.headerGradientStart} />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>ChatGPT 4.0</Text>
                            <Text style={styles.headerSubtitle}>Pro Edition</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.iconButton}>
                        <MoreVertical size={20} color={palette.iconOnHeader} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <MessageItem item={item} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
                getItemLayout={(data, index) => ({
                    length: 100, // Approximate item height
                    offset: 100 * index,
                    index,
                })}
                ListFooterComponent={
                    isTyping ? (
                        <View style={styles.typingContainer}>
                            <View style={[styles.avatar, styles.aiAvatarSmall]}>
                                <Bot size={12} color={palette.textOnAccent} />
                            </View>
                            <View style={styles.typingBubble}>
                                <ActivityIndicator size="small" color={palette.textSecondary} />
                                <Text style={styles.typingText}>thinking...</Text>
                            </View>
                        </View>
                    ) : null
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={styles.inputWrapper}>
                    <TouchableOpacity style={styles.attachButton}>
                        <Plus size={22} color={palette.iconSubtle} />
                    </TouchableOpacity>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Message..."
                            placeholderTextColor={palette.iconSubtle}
                            value={input}
                            onChangeText={setInput}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={!input.trim()}
                            style={[
                                styles.sendButton,
                                !input.trim() && styles.sendButtonDisabled,
                            ]}
                        >
                            <Send
                                size={18}
                                color={input.trim() ? palette.textOnAccent : palette.iconSubtle}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.background,
    },
    header: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sparkleContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EAF6E8',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerTitle: {
        color: palette.textOnAccent,
        fontSize: 16,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: palette.iconOnHeader,
        fontSize: 12,
    },
    iconButton: {
        padding: 4,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 24,
        maxWidth: '90%',
    },
    userWrapper: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    aiWrapper: {
        alignSelf: 'flex-start',
    },
    avatarContainer: {
        marginTop: 4,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatar: {
        backgroundColor: palette.userAvatar,
        marginLeft: 10,
    },
    aiAvatarSmall: {
        backgroundColor: palette.assistantGradientStart,
        width: 24,
        height: 24,
        marginRight: 8,
    },
    messageContent: {
        flex: 1,
    },
    roleText: {
        color: palette.textSecondary,
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
        marginHorizontal: 4,
    },
    bubble: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    userBubble: {
        borderTopRightRadius: 4,
    },
    aiBubble: {
        backgroundColor: palette.surfaceSoft,
        padding: 14,
        borderTopLeftRadius: 4,
    },
    gradientBubble: {
        padding: 14,
    },
    userText: {
        color: palette.textOnAccent,
        fontSize: 15,
        lineHeight: 22,
    },
    aiText: {
        color: palette.textPrimary,
        fontSize: 15,
        lineHeight: 22,
    },
    timeText: {
        color: palette.textMuted,
        fontSize: 10,
        marginTop: 6,
        marginHorizontal: 4,
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.surfaceSoft,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderTopLeftRadius: 4,
    },
    typingText: {
        color: palette.textSecondary,
        fontSize: 13,
        marginLeft: 8,
        fontStyle: 'italic',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: palette.surface,
        borderTopWidth: 1,
        borderTopColor: palette.border,
    },
    attachButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.surfaceSoft,
        borderRadius: 24,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: palette.border,
    },
    input: {
        flex: 1,
        color: palette.textPrimary,
        fontSize: 15,
        paddingVertical: 10,
        maxHeight: 100,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: palette.userGradientStart,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    sendButtonDisabled: {
        backgroundColor: palette.sendDisabled,
    },
});

export default ChatInterface;
