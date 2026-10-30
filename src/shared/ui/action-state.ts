export type ActionState = { success: boolean; message: string };
export type FormAction = (
  previous: ActionState,
  data: FormData,
) => Promise<ActionState>;
