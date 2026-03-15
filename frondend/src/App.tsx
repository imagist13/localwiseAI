import './App.css'
import { DeleteOutlined, OpenAIOutlined, SyncOutlined } from '@ant-design/icons';
import {
  Actions,
  Bubble,
  Conversations,
  Sender,
  XProvider,
} from '@ant-design/x';
import type { BubbleListProps, SenderProps } from '@ant-design/x';

import XMarkdown from '@ant-design/x-markdown';
import {
  DeepSeekChatProvider,
  useXChat,
  useXConversations,
  XRequest,
} from '@ant-design/x-sdk';
import type {
  DefaultMessageInfo,
  SSEFields,
  XModelMessage,
  XModelParams,
  XModelResponse,
} from '@ant-design/x-sdk';
import { Flex, message } from 'antd';
import type { GetRef } from 'antd';
import { createStyles } from 'antd-style';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import type { BubbleListRef } from '@ant-design/x/es/bubble';
import { useMarkdownTheme } from '../x-markdown/demo/utils';
import zhCNLocale from './_utils/local';  



const useStyle = createStyles(({ token, css }) => {
  return {
    layout: css`
      width: 100%;
      height: 100vh;
      display: flex;
      background: ${token.colorBgContainer};
      overflow: hidden;
    `,
    side: css`
      background: ${token.colorBgLayout};
      width: 280px;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 12px;
      box-sizing: border-box;
    `,
    logo: css`
      display: flex;
      align-items: center;
      justify-content: start;
      padding: 0 24px;
      box-sizing: border-box;
      gap: 8px;
      margin: 24px 0;

      span {
        font-weight: bold;
        color: ${token.colorText};
        font-size: 16px;
      }
    `,
    conversations: css`
      overflow-y: auto;
      margin-top: 12px;
      padding: 0;
      flex: 1;
      .ant-conversations-list {
        padding-inline-start: 0;
      }
    `,
    sideFooter: css`
      border-top: 1px solid ${token.colorBorderSecondary};
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `,
    chat: css`
      height: 100%;
      flex: 1;
      min-width: 0;
      overflow: auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding-block: ${token.paddingLG}px;
      padding-inline: ${token.paddingLG}px;
      gap: 16px;
      .ant-bubble-content-updating {
        background-image: linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%);
        background-size: 100% 2px;
        background-repeat: no-repeat;
        background-position: bottom;
      }
    `,
    startPage: css`
      display: flex;
      width: 100%;
      max-width: 840px;
      flex-direction: column;
      align-items: center;
      height: 100%;
    `,
    agentName: css`
      margin-block-start: 25%;
      font-size: 32px;
      margin-block-end: 38px;
      font-weight: 600;
    `,
    chatList: css`
      display: flex;
      align-items: center;
      width: 100%;
      height: 100%;
      flex-direction: column;
      justify-content: space-between;
    `,
  };
});

// ==================== Context ====================
const ChatContext = React.createContext<{
  onReload?: ReturnType<typeof useXChat>['onReload'];
}>({});
const DEFAULT_CONVERSATIONS_ITEMS = [
  {
    key: 'default-0',
    label: zhCNLocale.whatIsAntDesignX,
    group: zhCNLocale.today,
  },
  {
    key: 'default-1',
    label: zhCNLocale.howToQuicklyInstallAndImportComponents,
    group: zhCNLocale.today,
  },
  {
    key: 'default-2',
    label: zhCNLocale.newAgiHybridInterface,
    group: zhCNLocale.yesterday,
  },
];
const HISTORY_MESSAGES: {
  [key: string]: DefaultMessageInfo<XModelMessage>[];
} = {
  'default-1': [
    {
      message: { role: 'user', content: zhCNLocale.howToQuicklyInstallAndImportComponents },
      status: 'success',
    },
    {
      message: {
        role: 'assistant',
        content: zhCNLocale.aiMessage_2,
      },
      status: 'success',
    },
  ],
  'default-2': [
    { message: { role: 'user', content: zhCNLocale.newAgiHybridInterface }, status: 'success' },
    {
      message: {
        role: 'assistant',
        content: zhCNLocale.aiMessage_1,
      },
      status: 'success',
    },
  ],
};

const slotConfig: SenderProps['slotConfig'] = [
  { type: 'text', value: zhCNLocale.slotTextStart },
  {
    type: 'select',
    key: 'destination',
    props: {
      defaultValue: 'X SDK',
      options: ['X SDK', 'X Markdown', 'Bubble'],
    },
  },
  { type: 'text', value: zhCNLocale.slotTextEnd },
];
const historyMessageFactory = (conversationKey: string): DefaultMessageInfo<XModelMessage>[] => {
  return HISTORY_MESSAGES[conversationKey] || [];
};
const providerCaches = new Map<string, DeepSeekChatProvider>();
const providerFactory = (conversationKey: string) => {
  if (!providerCaches.get(conversationKey)) {
    providerCaches.set(
      conversationKey,
      new DeepSeekChatProvider({
        request: XRequest<XModelParams, Partial<Record<SSEFields, XModelResponse>>>(
          'http://127.0.0.1:8000/chat',
          {
            manual: true,
            params: {
              stream: true,
              model: 'deepseek-chat',
            },
          },
        ),
      }),
    );
  }
  return providerCaches.get(conversationKey);
};6
const Footer: React.FC<{
  id?: string;
  content: string;
  status?: string;
}> = ({ id, content, status }) => {
  const context = React.useContext(ChatContext);
  const Items = [
    {
      key: 'retry',
      label: zhCNLocale.retry,
      icon: <SyncOutlined />,
      onItemClick: () => {
        if (id) {
          context?.onReload?.(id, {
            userAction: 'retry',
          });
        }
      },
    },
    {
      key: 'copy',
      actionRender: <Actions.Copy text={content} />,
    },
  ];
  return status !== 'updating' && status !== 'loading' ? (
    <div style={{ display: 'flex' }}>{id && <Actions items={Items} />}</div>
  ) : null;
};

const getRole = (className: string): BubbleListProps['role'] => ({
  assistant: {
    placement: 'start',
    footer: (content, { status, key }) => (
      <Footer content={content} status={status} id={key as string} />
    ),
    contentRender: (content: any, { status }) => {
      const newContent = content.replace(/\n\n/g, '<br/><br/>');
      return (
        <XMarkdown
          paragraphTag="div"
          className={className}
          streaming={{
            hasNextChunk: status === 'updating',
            enableAnimation: true,
          }}
        >
          {newContent}
        </XMarkdown>
      );
    },
  },
  user: { placement: 'end' },
});

const App = () => {
  const [className] = useMarkdownTheme();
  const senderRef = useRef<GetRef<typeof Sender>>(null);
  const { conversations, addConversation, setConversations } = useXConversations({
    defaultConversations: DEFAULT_CONVERSATIONS_ITEMS,
  });
  const [curConversation, setCurConversation] = useState<string>(
    DEFAULT_CONVERSATIONS_ITEMS[0].key,
  );

  const [activeConversation, setActiveConversation] = useState<string>();

  const listRef = useRef<BubbleListRef>(null);

  // ==================== Runtime ====================

  const { onRequest, messages, isRequesting, abort, onReload } = useXChat({
    provider: providerFactory(curConversation), // every conversation has its own provider
    conversationKey: curConversation,
    defaultMessages: historyMessageFactory(curConversation),
    requestPlaceholder: () => {
      return {
        content: zhCNLocale.noData,
        role: 'assistant',
      };
    },
    requestFallback: (_, { error, errorInfo, messageInfo }) => {
      if (error.name === 'AbortError') {
        return {
          content: messageInfo?.message?.content || zhCNLocale.requestAborted,
          role: 'assistant',
        };
      }
      return {
        content: errorInfo?.error?.message || zhCNLocale.requestFailed,
        role: 'assistant',
      };
    },
  });

  const { styles } = useStyle();
  const [messageApi, contextHolder] = message.useMessage();
  const [deepThink, setDeepThink] = useState<boolean>(true);

  useEffect(() => {
    senderRef.current!.focus({
      cursor: 'end',
    });
  }, [senderRef.current]);
  return (
    <XProvider locale={zhCNLocale}>
      {contextHolder}
      <ChatContext.Provider value={{ onReload }}>
        <div className={styles.layout}>
          <div className={styles.side}>
            <div className={styles.logo}>
              <img
                src="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*eco6RrQhxbMAAAAAAAAAAAAADgCCAQ/original"
                draggable={false}
                alt="logo"
                width={24}
                height={24}
              />
              <span>Ant Design X</span>
            </div>
            <Conversations
              creation={{
                onClick: () => {
                  if (messages.length === 0) {
                    messageApi.error(zhCNLocale.itIsNowANewConversation);
                    return;
                  }
                  const now = dayjs().valueOf().toString();
                  addConversation({
                    key: now,
                    label: `${zhCNLocale.newConversation} ${conversations.length + 1}`,
                    group: zhCNLocale.today,
                  });
                  setCurConversation(now);
                },
              }}
              items={conversations
                .map(({ key, label, ...other }) => ({
                  key,
                  label: key === activeConversation ? `[${zhCNLocale.curConversation}]${label}` : label,
                  ...other,
                }))
                .sort(({ key }) => (key === activeConversation ? -1 : 0))}
              className={styles.conversations}
              activeKey={curConversation}
              onActiveChange={async (val) => {
                setCurConversation(val);
              }}
              groupable
              styles={{ item: { padding: '0 8px' } }}
              menu={(conversation) => ({
                items: [
                  {
                    label: zhCNLocale.delete,
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => {
                      const newList = conversations.filter((item) => item.key !== conversation.key);
                      const newKey = newList?.[0]?.key;
                      setConversations(newList);
                      if (conversation.key === curConversation) {
                        setCurConversation(newKey);
                      }
                    },
                  },
                ],
              })}
            />
          </div>
          <div className={styles.chat}>
            <div className={styles.chatList}>
              {messages?.length !== 0 && (
                /* 🌟 消息列表 */
                <Bubble.List
                  ref={listRef}
                  styles={{
                    root: {
                      maxWidth: 940,
                      height: 'calc(100% - 160px)',
                      marginBlockEnd: 24,
                    },
                  }}
                  items={messages?.map((i) => ({
                    ...i.message,
                    key: i.id,
                    status: i.status,
                    loading: i.status === 'loading',
                    extraInfo: (i.message as any).extraInfo,
                  }))}
                  role={getRole(className)}
                />
              )}
              <div
                style={{ width: '100%', maxWidth: 840 }}
                className={clsx({ [styles.startPage]: messages.length === 0 })}
              >
                {messages.length === 0 && (
                  <div className={styles.agentName}>{zhCNLocale.agentName}</div>
                )}
                <Sender
                  suffix={false}
                  ref={senderRef}
                  key={curConversation}
                  slotConfig={slotConfig}
                  loading={isRequesting}
                  onSubmit={(val) => {
                    if (!val) return;
                    onRequest({
                      messages: [{ role: 'user', content: val }],
                      thinking: {
                        type: 'disabled',
                      },
                    });
                    listRef.current?.scrollTo({ top: 'bottom' });
                    setActiveConversation(curConversation);
                    senderRef.current?.clear?.();
                  }}
                  onCancel={() => {
                    abort();
                  }}
                  placeholder={zhCNLocale.placeholder}
                  footer={(actionNode) => {
                    return (
                      <Flex justify="space-between" align="center">
                        <Flex gap="small" align="center">
                          <Sender.Switch
                            value={deepThink}
                            onChange={(checked: boolean) => {
                              setDeepThink(checked);
                            }}
                            icon={<OpenAIOutlined />}
                          >
                            {zhCNLocale.deepThink}
                          </Sender.Switch>
                        </Flex>
                        <Flex align="center">{actionNode}</Flex>
                      </Flex>
                    );
                  }}
                  autoSize={{ minRows: 3, maxRows: 6 }}
                />
              </div>
            </div>
          </div>
        </div>
      </ChatContext.Provider>
    </XProvider>
  );
};


export default App
