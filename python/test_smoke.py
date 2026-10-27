# E2E スモークテスト：3Dエンジン・常時着衣・性別テンプレート・GLB出力の実機検証
# 重要: このテスト群は実ブラウザ（WebGL）での実動作を検証するものであり、
# 描画のモックは一切行わない（品質確認に使える状態を保つ）。
import json
import re
import struct
import pytest
from playwright.sync_api import expect


def open_general_editor(page, base_url):
    page.goto(f"{base_url}#/editor")
    page.wait_for_timeout(1500)
    expect(page.locator(".panel-center canvas").first).to_be_visible()
    assert not page.get_by_text("WebGLを利用できません").is_visible()


def test_home_page_shows(page, base_url):
    page.goto(base_url)
    expect(page).to_have_title(re.compile("Personal Visual Studio"))
    expect(page.get_by_role("heading", name="一般モード")).to_be_visible()
    expect(page.get_by_role("heading", name="医療機関モード")).to_be_visible()


def test_general_editor_renders_3d(page, base_url):
    page.goto(f"{base_url}#/editor")
    # 3Dキャンバスが存在する
    canvas = page.locator(".panel-center canvas").first
    expect(canvas).to_be_visible()
    page.wait_for_timeout(1500)
    # WebGL が初期化されエラー通知がないこと
    assert not page.get_by_text("WebGLを利用できません").is_visible()
    # 部位ツリーが表示される
    expect(page.get_by_text("頭部・顔全体")).to_be_visible()
    # 3Dメッシュが実際に描画されている（背景色一色ではない）
    img = canvas.screenshot()
    assert len(img) > 10000, "canvas の描画内容が小さすぎる（真っ黒/空白の可能性）"


def test_3d_mesh_exists_and_camera_rotates(page, base_url):
    """マウス操作で実際に360度回転できることの検証"""
    open_general_editor(page, base_url)
    canvas = page.locator(".panel-center canvas").first
    box = canvas.bounding_box()
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2

    before = canvas.screenshot()
    # ドラッグで水平回転（OrbitControls）
    page.mouse.move(cx, cy)
    page.mouse.down()
    for i in range(10):
        page.mouse.move(cx - 200 + i * 40, cy + (i % 3) * 10)
        page.wait_for_timeout(30)
    page.mouse.up()
    page.wait_for_timeout(800)
    after = canvas.screenshot()
    assert before != after, "ドラッグしても描画が変化しない（カメラ回転が機能していない）"

    # 視点プリセット（背面）でも正面と描画が変わること
    page.get_by_role("button", name="背面").click()
    page.wait_for_timeout(800)
    back = canvas.screenshot()
    page.get_by_role("button", name="正面").click()
    page.wait_for_timeout(800)
    front = canvas.screenshot()
    assert back != front, "正面と背面で描画が同じ（立体形状が変化していない）"


def test_general_mode_always_clothed(page, base_url):
    """一般モードの常時着衣：初期状態・全削除不可能の検証"""
    open_general_editor(page, base_url)
    page.get_by_role("button", name="衣服").click()
    page.wait_for_timeout(300)
    # 初期状態でトップス・パンツがチェック済み
    tops = page.locator(".param-row", has_text="トップス").locator("input[type=checkbox]").first
    pants = page.locator(".param-row", has_text="パンツ").locator("input[type=checkbox]").first
    expect(tops).to_be_checked()
    expect(pants).to_be_checked()

    # トップスのチェックを外そうとする（唯一の上半身衣服）
    tops.click()  # uncheck() は状態変化を待つため、ブロック検証には click() を使う
    page.wait_for_timeout(500)
    # ブロック通知が表示される、または強制的にチェックが戻る
    status = page.locator(".statusbar").last.inner_text()
    blocked = "常時着衣" in status
    rechecked = tops.is_checked()
    assert blocked or rechecked, "一般モードで最後の上半身衣服が外せてしまう"

    # 交換はできる: アウターを着てからトップスを外す
    outer = page.locator(".param-row", has_text="アウター").locator("input[type=checkbox]").first
    outer.check()
    page.wait_for_timeout(200)
    tops.uncheck()
    page.wait_for_timeout(200)
    expect(outer).to_be_checked()
    expect(tops).not_to_be_checked()


def test_sex_template_switch_changes_body(page, base_url):
    """男性型/女性型で実際に3D形状が異なること・編集データが保持されること"""
    open_general_editor(page, base_url)
    # 編集データを作る（身長を特徴的に）
    page.get_by_role("button", name="全身").click()
    page.wait_for_timeout(300)
    height = page.locator("input[aria-label='身長']")
    height.fill("1.8")
    page.wait_for_timeout(500)
    canvas = page.locator(".panel-center canvas").first
    female_img = canvas.screenshot()

    # 女性型 → 男性型
    page.locator("select[aria-label='性別体型ベース']").select_option("male")
    page.wait_for_timeout(1000)
    male_img = canvas.screenshot()
    assert female_img != male_img, "性別テンプレートを切り替えても3D形状が変化しない"

    # 編集データ（身長）が保持されている
    expect(page.locator("input[aria-label='身長']")).to_have_value("1.8")
    # 元に戻すと女性型に戻る
    page.get_by_role("button", name="元に戻す").first.click()
    page.wait_for_timeout(800)
    female_again = canvas.screenshot()
    assert male_img != female_again


def test_part_selection_and_param_edit(page, base_url):
    open_general_editor(page, base_url)
    # 部位ツリーで「鼻」を選択
    page.locator(".part-tree-item", has_text="鼻").first.click()
    expect(page.locator(".section-title", has_text="鼻").first).to_be_visible()
    # スライダーが表示される
    slider = page.locator("input[type=range]").first
    expect(slider).to_be_visible()


def test_shape_edit_reflects_in_3d_mesh(page, base_url):
    """身体形状の編集が実際の3Dメッシュへ反映されること"""
    open_general_editor(page, base_url)
    page.get_by_role("button", name="全身").click()
    page.wait_for_timeout(300)
    canvas = page.locator(".panel-center canvas").first
    before = canvas.screenshot()
    # 身長を大きく変える（step=0.005 に一致する値）
    page.locator("input[aria-label='身長']").fill("1.95")
    page.wait_for_timeout(800)
    after = canvas.screenshot()
    assert before != after, "身長変更が3Dメッシュに反映されない"


def test_undo_redo_buttons(page, base_url):
    open_general_editor(page, base_url)
    undo_btn = page.get_by_role("button", name="元に戻す").first
    expect(undo_btn).to_be_disabled()
    page.locator(".tabs button", has_text="全身").click()
    page.wait_for_timeout(300)
    slider = page.locator("input[aria-label='身長']")
    slider.fill("1.8")
    page.wait_for_timeout(300)
    expect(undo_btn).to_be_enabled()


def test_camera_preset_buttons(page, base_url):
    open_general_editor(page, base_url)
    expect(page.get_by_role("button", name="正面")).to_be_visible()
    expect(page.get_by_role("button", name="背面")).to_be_visible()
    page.get_by_role("button", name="左側面").click()
    page.wait_for_timeout(500)


def test_glb_export_and_reload(page, base_url, tmp_path):
    """GLBが出力でき、GLTFとして正しい形式で、再読込できること"""
    open_general_editor(page, base_url)
    with page.expect_download() as dl:
        page.get_by_role("button", name="GLB出力").click()
    download = dl.value
    glb_path = tmp_path / "export.glb"
    download.save_as(glb_path)
    data = glb_path.read_bytes()
    assert len(data) > 1000, "GLBファイルが小さすぎる"
    # GLBバイナリ形式の検証: マジック "glTF" + バージョン2
    magic, version, length = struct.unpack("<4sII", data[:12])
    assert magic == b"glTF", f"GLBマジックが不正: {magic}"
    assert version == 2, f"glTFバージョンが不正: {version}"
    assert length == len(data), "GLBヘッダ長が実際のサイズと一致しない"

    # 出力したGLBをアプリ内で再読込して確認（参照モデルとして表示）
    with page.expect_file_chooser() as fc:
        page.get_by_role("button", name="GLB読込").click()
    fc.value.set_files(str(glb_path))
    page.wait_for_timeout(1500)
    expect(page.locator(".statusbar").last).to_contain_text("GLBを読み込みました")


def test_glb_external_validation(page, base_url, tmp_path):
    """出力GLBが独立したパーサー検証で開けること（メッシュ・マテリアル含有）"""
    open_general_editor(page, base_url)
    with page.expect_download() as dl:
        page.get_by_role("button", name="GLB出力").click()
    glb_path = tmp_path / "external.glb"
    dl.value.save_as(glb_path)
    data = glb_path.read_bytes()
    # JSONチャンクの検証（チャンク0はJSON）
    chunk_len, chunk_type = struct.unpack("<I4s", data[12:20])
    assert chunk_type == b"JSON", f"第1チャンクがJSONでない: {chunk_type}"
    gltf_json = json.loads(data[20 : 20 + chunk_len].decode("utf-8"))
    assert "meshes" in gltf_json and len(gltf_json["meshes"]) > 0, "GLBにメッシュが含まれない"
    assert "materials" in gltf_json and len(gltf_json["materials"]) > 0, "GLBにマテリアルが含まれない"


def test_medical_editor_has_general_features(page, base_url, medical_credentials):
    """医療版が一般版の全機能（衣服タブ等）を使用できること"""
    # 医療認証（二画面）
    page.goto(f"{base_url}#/medical")
    page.wait_for_timeout(800)
    expect(page.get_by_text("第1認証")).to_be_visible()
    page.locator("#auth-userid").fill(medical_credentials["userId"])
    page.locator("#auth-password").fill(medical_credentials["loginPassword"])
    page.get_by_role("button", name="次へ").click()
    page.wait_for_timeout(800)
    expect(page.get_by_text("第2認証")).to_be_visible()
    page.locator("#auth-permit").fill(medical_credentials["permitPassword"])
    page.get_by_role("button", name="医療モードを開始").click()
    page.wait_for_timeout(1500)
    # 医療エディターが開く
    expect(page.locator(".panel-center canvas").first).to_be_visible()
    # 一般機能: 衣服タブ・髪タブが使用できる
    expect(page.get_by_role("button", name="衣服")).to_be_visible()
    expect(page.get_by_role("button", name="髪")).to_be_visible()
    page.get_by_role("button", name="衣服").click()
    page.wait_for_timeout(300)
    expect(page.locator(".section-title", has_text="衣服")).to_be_visible()
    # 医療専用機能も使用できる
    expect(page.get_by_role("button", name="計測")).to_be_visible()
    expect(page.get_by_role("button", name="脱毛")).to_be_visible()
    # 医療専用部位がツリーに表示される
    expect(page.get_by_text("恥丘")).to_be_visible()


def test_scenario_save_and_compare(page, base_url):
    open_general_editor(page, base_url)
    page.locator("input[placeholder*='案の名前']").fill("案A")
    page.get_by_role("button", name="現在の状態を保存").click()
    expect(page.get_by_text("案A", exact=True)).to_be_visible()
    # 比較ボタンで2画面表示
    page.locator(".scenario-chip", has_text="案A").get_by_role("button", name="比較").click()
    page.wait_for_timeout(500)
    assert page.locator(".panel-center canvas").count() == 2


def test_quality_screenshots(page, base_url, tmp_path):
    """顔・全身のレンダリング品質確認用スクリーンショット"""
    open_general_editor(page, base_url)
    page.wait_for_timeout(800)
    page.locator(".panel-center canvas").first.screenshot(path=str(tmp_path / "fullbody_general.png"))
    page.get_by_role("button", name="顔アップ").click()
    page.wait_for_timeout(800)
    page.locator(".panel-center canvas").first.screenshot(path=str(tmp_path / "face_general.png"))
