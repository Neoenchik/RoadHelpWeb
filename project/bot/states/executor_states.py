from aiogram.fsm.state import State, StatesGroup


class ExecutorRegistration(StatesGroup):
    waiting_for_phone = State()


class ActiveOrder(StatesGroup):
    updating_location = State()
