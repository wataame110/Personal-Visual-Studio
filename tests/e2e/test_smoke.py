# E2E スモークテスト：基本動作・認証・編集・出力
import re
import pytest
from playwright.sync_api import expect


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
    # WebGL が初期化されエラー通知がないこと
    page.wait_for_timeout(1500)
    assert not page.get_by_text("WebGLを利用できません").is_visible()
    # 部位ツリーが表示される
    expect(page.get_by_text("頭部・顔全体")).to_be_visible()


def test_part_selection_and_param_edit(page, base_url):
    page.goto(f"{base_url}#/editor")
    page.wait_for_timeout(1200)
    # 部位ツリーで「鼻」を選択
    page.locator(".part-tree-item", has_text="鼻").first.click()
    expect(page.locator(".section-title", has_text="鼻").first).to_be_visible()
    # スライダーが表示される
    slider = page.locator("input[type=range]").first
    expect(slider).to_be_visible()


def test_undo_redo_buttons(page, base_url):
    page.goto(f"{base_url}#/editor")
    page.wait_for_timeout(1000)
    undo_btn = page.get_by_role("button", name="元に戻す").first
    expect(undo_btn).to_be_disabled()
    # 身長スライダーを変更して履歴を作成
    page.locator(".tabs button", has_text="全身").click()
    slider = page.locator("input[aria-label='身長']")
    slider.fill("1.8")
    page.wait_for_timeout(300)
    expect(undo_btn).to_be_enabled()


def test_camera_preset_buttons(page, base_url):
    page.goto(f"{base_url}#/editor")
    page.wait_for_timeout(1000)
    expect(page.get_by_role("button", name="正面")).to_be_visible()
    expect(page.get_by_role("button", name="背面")).to_be_visible()
    page.get_by_role("button", name="左側面").click()


def test_medical_auth_two_screens(page, base_url, medical_credentials):
    page.goto(f"{base_url}#/medical")
    # 未認証なら第1画面へリダイレクトされる
    page.wait_for_timeout(800)
    expect(page.get_by_text("第1認証")).to_be_visible()

    # 誤った資格情報では進めない
    page.locator("#auth-userid").fill("wrong-user")
    page.locator("#auth-password").fill("wrong-pass")
    page.get_by_role("button", name="次へ").click()
    expect(page.get_by_text("一致しません")).to_be_visible()
    assert "medical-permit" not in page.url

    # 正しい資格情報で第2画面へ
    page.locator("#auth-userid").fill(medical_credentials["userId"])
    page.locator("#auth-password").fill(medical_credentials["loginPassword"])
    page.get_by_role("button", name="次へ").click()
    expect(page.get_by_text("第2認証")).to_be_visible()

    # 誤った使用許可パスワードでは進めない
    page.locator("#auth-permit").fill("wrong-permit")
    page.get_by_role("button", name="医療モードを開始").click()
    expect(page.get_by_text("一致しません")).to_be_visible()

    # 正しい使用許可パスワードで医療画面へ
    page.locator("#auth-permit").fill(medical_credentials["permitPassword"])
    page.get_by_role("button", name="医療モードを開始").click()
    page.wait_for_timeout(1500)
    expect(page.get_by_text("医療モード：視覚的説明支援")).to_be_visible()
    # 医療専用部位がツリーに表示される
    expect(page.get_by_text("恥丘")).to_be_visible()

    # ログアウトで状態解除
    page.get_by_role("button", name="ログアウト").click()
    page.wait_for_timeout(500)
    page.goto(f"{base_url}#/medical")
    page.wait_for_timeout(800)
    expect(page.get_by_text("第1認証")).to_be_visible()


def test_scenario_save_and_compare(page, base_url):
    page.goto(f"{base_url}#/editor")
    page.wait_for_timeout(1000)
    page.locator("input[placeholder*='案の名前']").fill("案A")
    page.get_by_role("button", name="現在の状態を保存").click()
    expect(page.get_by_text("案A", exact=True)).to_be_visible()
    # 比較ボタンで2画面表示
    page.locator(".scenario-chip", has_text="案A").get_by_role("button", name="比較").click()
    page.wait_for_timeout(500)
    assert page.locator(".panel-center canvas").count() == 2
