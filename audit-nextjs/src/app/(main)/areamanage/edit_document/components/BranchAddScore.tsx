"use client";

import { useEffect } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn, getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

type ScoreValue = -1 | 0 | 1;

const FormSchema = z.object({
    score: z
        .union([z.literal(-1), z.literal(0), z.literal(1)])
        .optional()
        .refine((v) => v !== undefined, { message: "กรุณาเลือกคะแนน" }),
    note: z.string().optional(),
});

type BranchAddScoreProps = {
    isOpen: boolean;
    onClose: () => void;
    itemId?: number;
    itemName?: string;
    initialScore?: -1 | 0 | 1 | null;
    initialNote?: string;
    onSubmit?: (payload: {
        itemId?: number;
        score: ScoreValue;
        note?: string;
    }) => Promise<void> | void;
};

type FormValues = z.infer<typeof FormSchema>;

export default function BranchAddScore({
    isOpen,
    onClose,
    itemId,
    itemName,
    initialScore = null,
    initialNote = "",
    onSubmit,
}: BranchAddScoreProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        mode: "onChange",
        defaultValues: {
            score: initialScore ?? undefined,
            note: initialNote ?? "",
        },
    });

    const isSubmitting = form.formState.isSubmitting;
    const canSubmit = form.formState.isValid && !isSubmitting;

    useEffect(() => {
        if (!isOpen) return;
        form.reset({
            score: initialScore ?? undefined,
            note: initialNote ?? "",
        });
    }, [isOpen, initialScore, initialNote, form]);

    const handleSubmit = async (value: FormValues) => {
        if (!canSubmit) return;

        try {
            if (onSubmit) {
                await onSubmit({
                    itemId,
                    // Safe because canSubmit implies the schema is valid (score is selected).
                    score: value.score as ScoreValue,
                    note: value.note?.trim() ? value.note.trim() : undefined,
                });
            } else {
                toast.success("บันทึกคะแนนเรียบร้อย", {
                    description: "(ยังไม่ได้ผูก API — ตอนนี้เป็น UI สำหรับกรอกคะแนน)",
                });
            }
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("บันทึกคะแนนไม่สำเร็จ", {
                description: getErrorMessage(err, "กรุณาลองใหม่อีกครั้ง"),
            });
        }
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="sm:max-w-130">
                <DialogHeader>
                    <DialogTitle>{initialScore !== null ? "แก้ไขคะแนนสาขา" : "เพิ่มคะแนนสาขา"}</DialogTitle>
                    <DialogDescription>
                        {itemName ? (
                            <span>
                                {initialScore !== null ? "แก้ไข" : "เพิ่ม"}คะแนนสำหรับรายการ: <span className="font-medium">{itemName}</span>
                            </span>
                        ) : (
                            initialScore !== null ? "แก้ไขคะแนนให้สาขา" : "เพิ่มคะแนนให้สาขา"
                        )}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full">
                    <div className="space-y-4 py-2">
                        <Field data-invalid={!!form.formState.errors.score} data-disabled={isSubmitting}>
                            <FieldLabel>
                                คะแนน <span className="text-red-500">*</span>
                            </FieldLabel>
                            <FieldContent>
                                <Controller
                                    control={form.control}
                                    name="score"
                                    render={({ field }) => (
                                        <RadioGroup
                                            value={field.value === undefined ? "" : String(field.value)}
                                            onValueChange={(v) =>
                                                field.onChange(v === "" ? undefined : (Number(v) as ScoreValue))
                                            }
                                            className="gap-2"
                                            disabled={isSubmitting}
                                        >
                                            <label
                                                className={cn(
                                                    "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                                                    field.value === 1 && "border-ring bg-muted"
                                                )}
                                            >
                                                <RadioGroupItem value="1" aria-invalid={!!form.formState.errors.score} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">+1 (เพิ่มคะแนน)</span>
                                                    <span className="text-xs text-muted-foreground">ผ่าน / เป็นไปตามข้อกำหนด</span>
                                                </div>
                                            </label>

                                            <label
                                                className={cn(
                                                    "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                                                    field.value === 0 && "border-ring bg-muted"
                                                )}
                                            >
                                                <RadioGroupItem value="0" aria-invalid={!!form.formState.errors.score} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">0 (ไม่คิดคะแนน)</span>
                                                    <span className="text-xs text-muted-foreground">ไม่ผ่าน / ไม่เป็นไปตามข้อกำหนด</span>
                                                </div>
                                            </label>

                                            <label
                                                className={cn(
                                                    "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                                                    field.value === -1 && "border-ring bg-muted"
                                                )}
                                            >
                                                <RadioGroupItem value="-1" aria-invalid={!!form.formState.errors.score} />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">-1 (หักคะแนน)</span>
                                                    <span className="text-xs text-muted-foreground">มีผลกระทบ</span>
                                                </div>
                                            </label>
                                        </RadioGroup>
                                    )}
                                />

                                <FieldDescription>เลือกได้ 3 ค่า: -1, 0, 1</FieldDescription>

                                <FieldError errors={[form.formState.errors.score]} />
                            </FieldContent>
                        </Field>

                        {/* <Field>
                            <FieldLabel>หมายเหตุ (ถ้ามี)</FieldLabel>
                            <FieldContent>
                                <Controller
                                    control={form.control}
                                    name="note"
                                    render={({ field }) => (
                                        <Textarea
                                            placeholder="ใส่รายละเอียดเพิ่มเติม..."
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    )}
                                />
                            </FieldContent>
                        </Field> */}
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" disabled={isSubmitting}>
                                ยกเลิก
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={!canSubmit}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSubmitting ? "กำลังบันทึก..." : initialScore !== null ? "บันทึกการแก้ไข" : "บันทึกคะแนน"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}