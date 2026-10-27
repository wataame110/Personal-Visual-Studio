// ポーズ選択・編集パネル
import { useEditorStore } from '../core/store';
import { POSES, POSE_CATEGORIES, getGeneralPoses, getMedicalPoses, getAllPoses } from '../core/poses';
import { JOINT_IDS } from '../core/skeleton';
import type { PoseCategory } from '../core/types';

interface Props {
  mode: 'general' | 'medical';
  showAdult?: boolean;
}

export function PosePanel({ mode, showAdult = false }: Props) {
  const pose = useEditorStore((s) => s.pose);
  const applyPoseById = useEditorStore((s) => s.applyPoseById);
  const setJointAngle = useEditorStore((s) => s.setJointAngle);
  const setCamera = useEditorStore((s) => s.setCamera);

  const availablePoses = showAdult
    ? getAllPoses()
    : mode === 'medical'
      ? getMedicalPoses()
      : getGeneralPoses();

  const categories = POSE_CATEGORIES.filter((c) => {
    if (c.medicalOnly && mode !== 'medical') return false;
    if (c.adultOnly && !showAdult) return false;
    return true;
  });

  const jointLabels: Record<string, string> = {
    [JOINT_IDS.PELVIS]: '骨盤',
    [JOINT_IDS.SPINE]: '脊椎',
    [JOINT_IDS.CHEST]: '胸部',
    [JOINT_IDS.NECK]: '首',
    [JOINT_IDS.HEAD]: '頭',
    [JOINT_IDS.SHOULDER_L]: '左肩',
    [JOINT_IDS.ELBOW_L]: '左肘',
    [JOINT_IDS.WRIST_L]: '左手首',
    [JOINT_IDS.SHOULDER_R]: '右肩',
    [JOINT_IDS.ELBOW_R]: '右肘',
    [JOINT_IDS.WRIST_R]: '右手首',
    [JOINT_IDS.HIP_L]: '左股関節',
    [JOINT_IDS.KNEE_L]: '左膝',
    [JOINT_IDS.ANKLE_L]: '左足首',
    [JOINT_IDS.HIP_R]: '右股関節',
    [JOINT_IDS.KNEE_R]: '右膝',
    [JOINT_IDS.ANKLE_R]: '右足首',
  };

  return (
    <div className="pose-panel">
      <div className="section-title">ポーズ選択</div>

      {/* カテゴリ別ポーズ選択 */}
      {categories.map((cat) => {
        const poses = availablePoses.filter((p) => p.category === cat.id);
        if (poses.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>{cat.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {poses.map((p) => (
                <button
                  key={p.id}
                  className={pose.poseId === p.id ? 'active' : ''}
                  onClick={() => applyPoseById(p.id)}
                  style={{ fontSize: 11, padding: '3px 8px' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* カスタム関節角度 */}
      <div className="section-title" style={{ marginTop: 16 }}>関節角度（カスタム）</div>
      {Object.entries(jointLabels).map(([id, label]) => {
        const angle = pose.customJointAngles[id] ?? 0;
        return (
          <div key={id} className="param-row">
            <label>{label}</label>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={angle}
              onChange={(e) => setJointAngle(id, Number(e.target.value))}
            />
            <input
              type="number"
              min={-180}
              max={180}
              value={angle}
              onChange={(e) => setJointAngle(id, Number(e.target.value))}
              style={{ width: 64 }}
            />
            <span className="unit">°</span>
          </div>
        );
      })}

      {/* カメラ視点 */}
      <div className="section-title" style={{ marginTop: 16 }}>カメラ視点</div>
      <div className="param-row">
        <label>方位角</label>
        <input
          type="range"
          min={0}
          max={360}
          step={5}
          value={pose.camera.azimuth}
          onChange={(e) => setCamera({ azimuth: Number(e.target.value) })}
        />
        <span className="unit">{pose.camera.azimuth}°</span>
      </div>
      <div className="param-row">
        <label>仰角</label>
        <input
          type="range"
          min={-90}
          max={90}
          step={5}
          value={pose.camera.elevation}
          onChange={(e) => setCamera({ elevation: Number(e.target.value) })}
        />
        <span className="unit">{pose.camera.elevation}°</span>
      </div>
      <div className="param-row">
        <label>距離</label>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={pose.camera.distance}
          onChange={(e) => setCamera({ distance: Number(e.target.value) })}
        />
        <span className="unit">{pose.camera.distance.toFixed(1)}x</span>
      </div>
    </div>
  );
}
