import { memo } from 'react'
import { Editor } from '@tiptap/react'
import { FontSizePicker } from '../../../components';
import { Toolbar } from '../../../components/tool-bar';
import { useTextmenuCommands, useTextmenuStates } from '../hooks';
import { Icon } from '@/components/icons';
import { VariablePicker } from '../../../components/VariablePicker';

// We memorize the button so each button is not rerendered
// on every editor state change
const MemoButton = memo(Toolbar.Button)
const MemoFontSizePicker = memo(FontSizePicker)
const MemoVariablePicker = memo(VariablePicker)

interface EditorMenuProps {
    editor: Editor;
}

export default function EditorToolBar({ editor }: EditorMenuProps) {

    const commands = useTextmenuCommands(editor)
    const states = useTextmenuStates(editor)
    return (
        <div className='flex  flex-row items-center gap-2'>
            <MemoButton onClick={commands.onUndo}>
                <Icon name="Undo" />
            </MemoButton>

            <MemoButton onClick={commands.onRedo}            >
                <Icon name="Redo" />
            </MemoButton>
            <Toolbar.Divider />
            <MemoFontSizePicker onChange={commands.onSetFontSize} value={states.currentSize || ''} />
            <MemoButton
                onClick={commands.onBold}
                active={states.isBold}
            >
                <Icon name="Bold" />
            </MemoButton>
            <MemoButton
                onClick={commands.onItalic}
                active={states.isItalic}
            >
                <Icon name="Italic" />
            </MemoButton>
            <MemoButton
                onClick={commands.onUnderline}
                active={states.isUnderline}
            >
                <Icon name="Underline" />
            </MemoButton>
            <MemoButton
                onClick={commands.onStrike}
                active={states.isStrike}
            >
                <Icon name="Strikethrough" />
            </MemoButton>
            <Toolbar.Divider />
            <MemoButton
                onClick={commands.onAlignLeft}
                active={states.isAlignLeft}
            >
                <Icon name="AlignLeft" />
            </MemoButton>
            <MemoButton
                onClick={commands.onAlignCenter}
                active={states.isAlignCenter}
            >
                <Icon name="AlignCenter" />
            </MemoButton>
            <MemoButton
                onClick={commands.onAlignRight}
                active={states.isAlignRight}
            >
                <Icon name="AlignRight" />
            </MemoButton>
            <MemoButton
                onClick={commands.onAlignJustify}
                active={states.isAlignJustify}
            >
                <Icon name="AlignJustify" />
            </MemoButton>
            <Toolbar.Divider />
            <MemoVariablePicker onChange={(variable) => { commands.onInsertVariable(variable) }} />
        </div >
    )
}
