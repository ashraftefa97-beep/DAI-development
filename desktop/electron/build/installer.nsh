!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER
Var DaiOptionsDialog
Var DaiStartupCheckbox
Var DaiDesktopCheckbox
Var DaiStartupState
Var DaiDesktopState
!endif

!macro customHeader
  !define MUI_WELCOMEPAGE_TITLE "DAI AI — ضي"
  !define MUI_WELCOMEPAGE_TEXT "Welcome to DAI AI.$\r$\n$\r$\nمرحبًا بك في ضي — مساعدك الذكي بتجربة هادئة وآمنة."
  !define MUI_FINISHPAGE_TITLE "DAI AI is ready — ضي جاهزة"
  !define MUI_FINISHPAGE_TEXT "Installation completed successfully.$\r$\nتم تثبيت ضي بنجاح. افتح البرنامج وسجّل دخولك للبدء."
!macroend

!ifndef BUILD_UNINSTALLER

!macro customInit
  StrCpy $DaiStartupState ${BST_CHECKED}
  StrCpy $DaiDesktopState ${BST_CHECKED}
!macroend

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
  Page custom DaiOptionsPageCreate DaiOptionsPageLeave
!macroend

Function DaiOptionsPageCreate
  nsDialogs::Create 1018
  Pop $DaiOptionsDialog
  ${If} $DaiOptionsDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 22u "إعداد ضي / DAI AI setup"
  Pop $0
  CreateFont $1 "Segoe UI" 11 700
  SendMessage $0 ${WM_SETFONT} $1 1

  ${NSD_CreateLabel} 0 27u 100% 34u "اختار تفضيلات البداية. تقدر تغيّر تشغيل ضي مع Windows لاحقًا من الإعدادات.$\r$\nChoose how DAI AI should start on this PC."
  Pop $0

  ${NSD_CreateCheckbox} 0 72u 100% 16u "تشغيل ضي مع Windows / Start DAI AI with Windows"
  Pop $DaiStartupCheckbox
  ${NSD_Check} $DaiStartupCheckbox

  ${NSD_CreateCheckbox} 0 98u 100% 16u "إنشاء اختصار على سطح المكتب / Create desktop shortcut"
  Pop $DaiDesktopCheckbox
  ${NSD_Check} $DaiDesktopCheckbox

  ${NSD_CreateLabel} 0 132u 100% 42u "Standard: الشات والصوت.$\r$\nProfessional: تحكم آمن ومصرّح في برامج Windows والوسائط والملفات.$\r$\nYour plan is verified after sign-in."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function DaiOptionsPageLeave
  ${NSD_GetState} $DaiStartupCheckbox $DaiStartupState
  ${NSD_GetState} $DaiDesktopCheckbox $DaiDesktopState
FunctionEnd

!macro customInstall
  ${ifNot} ${isUpdated}
    ${If} $DaiStartupState == ${BST_CHECKED}
      WriteRegDWORD HKCU "Software\DAI AI" "StartWithWindows" 1
    ${Else}
      WriteRegDWORD HKCU "Software\DAI AI" "StartWithWindows" 0
    ${EndIf}

    ${If} $DaiDesktopState == ${BST_CHECKED}
      CreateShortCut "$DESKTOP\DAI AI.lnk" "$INSTDIR\DAI AI.exe"
    ${EndIf}
  ${endIf}
!macroend

!endif

!macro customUnInstall
  DeleteRegKey HKCU "Software\DAI AI"
  Delete "$DESKTOP\DAI AI.lnk"
!macroend
