import { memo } from 'react'
import { Editor } from '@tiptap/react'
import { useTextmenuCommands, useTextmenuStates } from '../hooks';
import { FontSizePicker, Toolbar, VariablePicker } from '../../../components';
import { Undo, Redo, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

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
        <div className='flex  flex-row items-center gap-1.5'>
            <MemoButton onClick={commands.onUndo} variant="ghost" className=''>
                <Undo className='size-3.5' />
            </MemoButton>

            <MemoButton onClick={commands.onRedo} variant="ghost" className=''>
                <Redo className='size-3.5' />
            </MemoButton>
            <Toolbar.Divider />
            <MemoFontSizePicker onChange={commands.onSetFontSize} value={states.currentSize || ''} />
            <MemoButton
                onClick={commands.onBold}
                active={states.isBold}
            >
                <Bold className='size-3.5' />
            </MemoButton>
            <MemoButton
                onClick={commands.onItalic}
                active={states.isItalic}
            >
                <Italic className='size-3.5' />
            </MemoButton>
            <MemoButton
                onClick={commands.onUnderline}
                active={states.isUnderline}
            >
                <Underline className='size-3.5' />
            </MemoButton>
            <MemoButton
                onClick={commands.onStrike}
                active={states.isStrike}
            >
                <Strikethrough className='size-3.5' />
            </MemoButton>
            <Toolbar.Divider />
            <MemoButton
                onClick={commands.onAlignLeft}
                active={states.isAlignLeft}
            >
                <AlignLeft className='size-3.5' />
            </MemoButton>
            <MemoButton
                onClick={commands.onAlignCenter}
                active={states.isAlignCenter}
            >
                <AlignCenter className='size-3.5' />
            </MemoButton>
            <MemoButton
                onClick={commands.onAlignRight}
                active={states.isAlignRight}
            >
                <AlignRight className='size-3.5' />
            </MemoButton>
            <MemoButton
                onClick={commands.onAlignJustify}
                active={states.isAlignJustify}
            >
                <AlignJustify className='size-3.5' />
            </MemoButton>
            <Toolbar.Divider />
            <MemoVariablePicker onChange={(variable) => { commands.onInsertVariable(variable) }} />
        </div >
    )
}
