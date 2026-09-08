import type { DiagnosisResult } from '@/lib/diagnosis'

export type ArchiveFeedbackType =
  | '功能建议'
  | '数据问题'
  | '体验问题'
  | 'Bug'

export type FeedbackArchiveRecord = {
  id: string
  initials: string
  avatarTone: string
  /** 旧版字段，仅用于兼容浏览器中已经保存的档案。 */
  userId?: string
  /** 从微信截图中截取的头像，作为可视化身份标识。 */
  avatarDataUrl?: string
  /** 产品经理补充的可选备注，不再要求填写平台用户 ID。 */
  userNote?: string
  source: string
  suggestion: string
  type: ArchiveFeedbackType
  module: string
  capturedAt: string
  imageName: string
  screenshotDataUrl?: string
  status: '已确认' | '待复核'
}

export const initialArchiveRecords: FeedbackArchiveRecord[] = [
  {
    id: 'FB-2026-0618',
    initials: '林',
    avatarTone: 'bg-cyan-600',
    userId: 'wxid_7f2a•••91',
    userNote: '林先生',
    source: '广州车主体验群',
    suggestion: '希望途经点可以长按拖动排序，临时改变行程时不用逐个删除再添加。',
    type: '功能建议',
    module: '路线规划',
    capturedAt: '今天 10:24',
    imageName: '微信截图_0910.png',
    status: '已确认'
  },
  {
    id: 'FB-2026-0617',
    initials: '周',
    avatarTone: 'bg-indigo-600',
    userId: 'wxid_a91c•••04',
    userNote: '周女士',
    source: '导航内测用户群',
    suggestion: '高架下定位容易跳到辅路，建议结合行驶方向减少道路层级误判。',
    type: '数据问题',
    module: '定位与地图',
    capturedAt: '昨天 18:42',
    imageName: '群聊反馈_0907.jpg',
    status: '待复核'
  },
  {
    id: 'FB-2026-0616',
    initials: 'M',
    avatarTone: 'bg-amber-500',
    userId: 'avatar_42b7•••6e',
    userNote: '内测用户 M',
    source: '产品体验群',
    suggestion: '弱网时路线详情页一直白屏，希望保留上一次成功加载的路线作为兜底。',
    type: 'Bug',
    module: '路线详情',
    capturedAt: '9月7日 14:16',
    imageName: '白屏问题.png',
    status: '已确认'
  },
  {
    id: 'FB-2026-0615',
    initials: '陈',
    avatarTone: 'bg-rose-500',
    userId: 'wxid_0dc3•••82',
    userNote: '陈先生',
    source: '上海通勤群',
    suggestion: '收藏地点太多后不好找，希望支持按城市或自定义标签筛选。',
    type: '体验问题',
    module: '地点收藏',
    capturedAt: '9月6日 09:31',
    imageName: '收藏建议.webp',
    status: '已确认'
  }
]

export function toArchiveFeedbackType(
  issueType: DiagnosisResult['issueType']
): ArchiveFeedbackType {
  if (issueType === 'Bug') return 'Bug'
  if (issueType === '地图或业务数据问题') return '数据问题'
  if (issueType === '产品需求') return '功能建议'
  return '体验问题'
}
